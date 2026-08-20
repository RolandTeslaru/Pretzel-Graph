"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggexEngine = void 0;
const engine_1 = require("../S2/engine");
const SystemError_1 = require("../../../shared/domain/SystemError");
const errors_1 = require("../errors");
const routing_service_1 = require("./routing-service");
const scheduler_service_1 = require("./scheduler-service");
const propagation_service_1 = require("./propagation-service");
const node_io_service_1 = require("./node-io-service");
const error_service_1 = require("./error-service");
const session_service_1 = require("./session-service");
const system_1 = require("../../../shared/system");
const framework_fields_1 = require("./framework-fields");
// Runs a compiled graph by translating raw S2 vertex events into node semantics. run() races
// S2Engine.ignite() against an abort-driven promise, and everything else happens in the hooks:
//
//   canVertexRun      Gate. An incoming error envelope fires immediately, bypassing every
//                     data/signal gate; otherwise RoutingService decides.
//   onVertexFired     Mark the node active and open its session record.
//   onVertexExecute   The actual work — see below.
//   onVertexWaiting   Not enough signals yet: hand the node its partial inputs via wait().
//   onVertexCompleted Close the session record, honour stopAtNodeId, then gate on pause.
//   onVertexError     Only reached by `terminate` / terminal errors; records the failure.
//
// onVertexExecute in order: catch or re-propagate an incoming error envelope; resolve inputs
// ("AND" reads every dependency, "OR" only the signals that arrived); evaluate field expressions
// in the airlock; run() or buildTool(); project outputs onto ports. Those four steps share one
// try/catch — the node's failure boundary. The returned signal set is what fans out, per the
// node's propagation strategy (router / none / all).
//
// This is NOT a DAG walk. Nodes fire on accumulated signals and may re-fire, so cycles are
// first-class and a node can execute many times in one run.
class AggexEngine {
    /** Abort reason marking an intentional "execute up until this point" stop (vs a real termination). */
    static STOP_AT_TARGET_REASON = "stop_at_target";
    /** @internal — accessed by engine services (RoutingService). */
    s2Engine = new engine_1.S2Engine();
    /** @internal — accessed by engine services (ErrorService). */
    flightRecorder = null;
    /** @internal — delegated engine subsystems. */
    services = {
        scheduler: new scheduler_service_1.SchedulerService(this),
        propagation: new propagation_service_1.PropagationService(this),
        routing: new routing_service_1.RoutingService(this),
        nodeIO: new node_io_service_1.NodeIOService(this),
        errors: new error_service_1.ErrorService(this),
        session: new session_service_1.SessionService(),
    };
    /** @internal — accessed by engine services (RoutingService). */
    nodeRuntimeMap = new Map();
    pausePromise = null;
    pauseResolve = null;
    hooks;
    constructor(hooks = {}) {
        this.hooks = hooks;
    }
    registerNode(vertexId, wfNode, instance) {
        this.nodeRuntimeMap.set(vertexId, { wfNode, instance });
    }
    attachFlightRecorder(recorder) {
        this.flightRecorder = recorder;
    }
    instanceRegistryAPI = {
        get: (nodeId) => this.nodeRuntimeMap.get(nodeId)?.instance,
        getAll: () => Array.from(this.nodeRuntimeMap.values()).map(e => e.instance),
    };
    // Getters preserve the external contract (`engine.propagationAPI.*`, `engine.schedulerAPI.*`).
    get propagationAPI() { return this.services.propagation; }
    get schedulerAPI() { return this.services.scheduler; }
    async run(ctx) {
        ctx.activeNodes.clear();
        const hooks = {
            onVertexExecute: (...props) => this.onNodeExecuted(ctx, ...props),
            onVertexFired: (...props) => this.onNodeFired(ctx, ...props),
            onVertexCompleted: (...props) => this.onNodeCompleted(ctx, ...props),
            onVertexWaiting: (...props) => this.onNodeWaiting(ctx, ...props),
            onVertexError: (...props) => this.onNodeError(ctx, ...props),
            canVertexRun: (...props) => this.canNodeRun(ctx, ...props),
        };
        const start = performance.now();
        try {
            return await Promise.race([
                this.s2Engine.ignite(ctx.compiledGraph, hooks).then(() => ({
                    status: "completed",
                    duration: (performance.now() - start) / 1000
                })),
                this.createRejectionPromise(ctx, start)
            ]);
        }
        finally {
            ctx.proxyAPI.destroyAll();
        }
    }
    createRejectionPromise(ctx, start) {
        return new Promise((resolve, reject) => {
            ctx.abortAPI.signal.addEventListener("abort", () => {
                // An intentional stop, not a termination.
                const stoppedAtTarget = ctx.abortAPI.signal.reason === AggexEngine.STOP_AT_TARGET_REASON;
                resolve({
                    status: stoppedAtTarget ? "completed" : "terminated",
                    duration: (performance.now() - start) / 1000
                });
            }, { once: true });
        });
    }
    pause() {
        if (this.pausePromise)
            return;
        this.pausePromise = new Promise((resolve) => {
            this.pauseResolve = resolve;
        });
    }
    resume() {
        if (!this.pausePromise || !this.pauseResolve)
            return;
        this.hooks.onResume?.();
        this.pauseResolve();
        this.pauseResolve = null;
        this.pausePromise = null;
    }
    async awaitPause(ctx) {
        if (!this.pausePromise)
            return;
        if (ctx.activeNodes.size === 0)
            this.hooks.onPause?.();
        await this.pausePromise;
    }
    onNodeFired(ctx, nodeId) {
        const entry = this.nodeRuntimeMap.get(nodeId);
        if (!entry)
            return;
        this.flightRecorder?.onNodeFired(entry.wfNode.id);
        ctx.activeNodes.add(nodeId);
        this.services.session.onNodeFired(ctx, entry);
    }
    onNodeExecuted = async (ctx, vertexId, signals) => {
        const entry = this.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return;
        const wfNode = entry.wfNode;
        const nodeInstance = entry.instance;
        // An upstream node failed with `propagate` — catch or re-propagate instead of running.
        const intercepted = this.services.errors.interceptIncoming(ctx, vertexId, nodeInstance);
        if (intercepted)
            return intercepted;
        const allDependencies = ctx.compiledGraph.dependenciesMap.get(vertexId);
        const dataDependency = (0, framework_fields_1.frameworkFields)(entry.instance)["dataDependency"];
        let result;
        let projectedResult;
        try {
            const inputs = this.services.nodeIO.getIncomingData(ctx, wfNode.id, dataDependency === "AND" ? allDependencies : signals);
            // Expressions run in the airlock; a throw/timeout is the node's failure
            // (→ onErrorStrategy), an OOM force-terminates (handled in handleNodeError).
            const fields = nodeInstance.evaluateFieldValues(inputs);
            system_1.System.log.debug("node executing", {
                nodeId: wfNode.id,
                dataDependency: dataDependency ?? "OR",
                signals: [...signals],
                deps: [...allDependencies],
                inputPorts: Object.keys(inputs),
            });
            this.flightRecorder?.onNodeExecuted(wfNode.id, signals, allDependencies, inputs, fields, ctx);
            const isTool = (0, framework_fields_1.frameworkFields)(nodeInstance)["isConvertedToTool"] === true;
            if (isTool)
                result = await nodeInstance.buildTool(inputs, fields);
            else
                result = await nodeInstance.run(inputs, fields);
            projectedResult = this.services.nodeIO.projectOutputs(ctx, result, wfNode);
        }
        catch (err) {
            // Input resolution, expression eval, execution and projection share one failure boundary.
            return this.services.errors.handle(ctx, vertexId, err);
        }
        this.services.session.onNodeExecuted(ctx, wfNode.id, result, projectedResult);
        switch (nodeInstance.getPropagationStrategy()) {
            case "router": return this.services.routing.resolveRouterSignals(ctx, wfNode.id, result);
            case "none": return new Set(); // empty set → fireVertexDependents signals nobody
            case "all": return; // void → fireVertexDependents signals all
        }
    };
    async onNodeCompleted(ctx, vertexId, resolvedOutSignals) {
        ctx.activeNodes.delete(vertexId);
        const entry = this.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return;
        // Errored nodes already recorded "failed" and handled their own propagation — don't
        // overwrite that. S2 still drives any returned signal set after this.
        if (ctx.session.node_status[entry.wfNode.id]?.status === "failed") {
            await this.awaitPause(ctx);
            return;
        }
        this.services.session.onNodeCompleted(ctx, entry, resolvedOutSignals);
        this.flightRecorder?.onNodeCompleted(entry.wfNode.id, ctx);
        // The target ran and its output is persisted + emitted — stop the rest of the workflow.
        if (ctx.stopAtNodeId === entry.wfNode.id)
            ctx.abortAPI.abort(AggexEngine.STOP_AT_TARGET_REASON);
        await this.awaitPause(ctx);
    }
    onNodeWaiting(ctx, vertexId, arrivedSignals, dependencyResolutionMap, _totalDeps) {
        const entry = this.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return;
        const { instance, wfNode } = entry;
        const nodeDepMap = {};
        Object.entries(dependencyResolutionMap).forEach(([_depId, resolved]) => {
            const depId = _depId;
            nodeDepMap[depId] = resolved;
        });
        system_1.System.log.debug("node waiting on dependencies", {
            nodeId: wfNode.id,
            arrived: [...arrivedSignals],
            resolution: nodeDepMap,
        });
        this.services.session.onNodeWaiting(ctx, wfNode.id);
        const partialInputs = this.services.nodeIO.getIncomingData(ctx, wfNode.id, arrivedSignals);
        let partialFields;
        try {
            partialFields = instance.evaluateFieldValues(partialInputs);
        }
        catch (err) {
            this.services.errors.handle(ctx, vertexId, err); // OOM → throws (terminate); else recorded
            return;
        }
        instance.wait(partialInputs, nodeDepMap, partialFields);
    }
    // Only reached when a throw escapes to S2 (`terminate` strategy, or a terminal/cyclic
    // UncaughtRuntimeNodeError). The run is already rejecting; just record it.
    onNodeError(ctx, vertexId, error) {
        system_1.System.log.error("node errored (reached S2)", {
            nodeId: vertexId,
            error: error instanceof Error ? error.message : String(error),
        });
        // Preserve an existing SystemError; wrap anything else.
        const aggexError = error instanceof SystemError_1.SystemError
            ? error
            : new errors_1.AggexExecutionError(SystemError_1.SystemError.Code.EXECUTION_NODE_FAILED, error instanceof Error ? error.message : String(error));
        this.services.errors.record(ctx, vertexId, aggexError.toJSON());
    }
    canNodeRun(ctx, vertexId, receivedSignals, s2EngineAssesment) {
        const entry = this.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return true;
        // Fail-fast: an error envelope bypasses every gate so the node fires immediately rather
        // than waiting on sibling inputs that will never arrive.
        if (this.services.errors.findIncomingEnvelope(ctx, vertexId))
            return true;
        return this.services.routing.canRunByDependencies(ctx, vertexId);
    }
}
exports.AggexEngine = AggexEngine;
