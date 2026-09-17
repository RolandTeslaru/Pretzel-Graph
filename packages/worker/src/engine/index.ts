/*
 * PretzelGraph — https://github.com/RolandTeslaru/Pretzel-Graph
 * Elastic License 2.0. See LICENSE.
 */
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { S2Engine } from "../S2/engine";
import { Vertex } from "../S2/graph";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { S2Hooks } from "src/S2/types";
import { AggexExecutionError } from "src/errors";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { FlightRecorderService } from "./flight-recorder-service";
import { RoutingService } from "./routing-service";
import { SchedulerService } from "./scheduler-service";
import { PropagationService } from "./propagation-service";
import { NodeIOService } from "./node-io-service";
import { ErrorService } from "./error-service";
import { SessionService } from "./session-service";
import { LifecycleEffectService } from "./lifecycle-effect-service";
import { System } from "@pretzel-graph/shared/system";
import { frameworkFields } from "./framework-fields";
import { ExecutionContext } from "../execution-context";


export interface AggexHooks {
    onPause?(): void;
    onResume?(): void;
}


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
export class AggexEngine {

    /** Abort reason marking an intentional "execute up until this point" stop (vs a real termination). */
    public static readonly STOP_AT_TARGET_REASON = "stop_at_target";

    /** @internal — accessed by engine services (RoutingService). */
    public  s2Engine:        S2Engine = new S2Engine();

    /** @internal — accessed by engine services (ErrorService). */
    public  flightRecorder:  FlightRecorderService | null = null;

    /** @internal — delegated engine subsystems. */
    public readonly services = {
        scheduler:   new SchedulerService(this),
        propagation: new PropagationService(this),
        routing:     new RoutingService(this),
        nodeIO:      new NodeIOService(this),
        errors:      new ErrorService(this),
        session:     new SessionService(this),
        lifecycleEffect: new LifecycleEffectService(this),
    };

    public readonly ctx: ExecutionContext;

    private pausePromise: Promise<void> | null = null;
    private pauseResolve: (() => void) | null = null;

    private hooks: AggexHooks;



    constructor({ hooks = {}, ...contextOptions }: AggexEngine.Options) {
        this.hooks = hooks;
        this.ctx   = new ExecutionContext(this, contextOptions);
    }



    public attachFlightRecorder(recorder: FlightRecorderService): void {
        this.flightRecorder = recorder;
    }



    // Getters preserve the external contract (`engine.propagationAPI.*`, `engine.schedulerAPI.*`).
    public get propagationAPI() { return this.services.propagation; }
    public get schedulerAPI()   { return this.services.scheduler; }



    public async run(): Promise<AggexEngine.Execution.Result> {

        this.ctx.activeNodes.clear();

        const hooks: S2Hooks = {
            onVertexExecute:   (...props: Parameters<S2Hooks["onVertexExecute"]>)   => this.onNodeExecuted(...props),
            onVertexFired:     (...props: Parameters<S2Hooks["onVertexFired"]>)     => this.onNodeFired(...props),
            onVertexCompleted: (...props: Parameters<S2Hooks["onVertexCompleted"]>) => this.onNodeCompleted(...props),
            onVertexWaiting:   (...props: Parameters<S2Hooks["onVertexWaiting"]>)   => this.onNodeWaiting(...props),
            onVertexError:     (...props: Parameters<S2Hooks["onVertexError"]>)     => this.onNodeError(...props),
            canVertexRun:      (...props: Parameters<S2Hooks["canVertexRun"]>)      => this.canNodeRun(...props),
        } as const

        const start = performance.now();

        try {
            const result = await Promise.race<AggexEngine.Execution.Result>([

                this.s2Engine.ignite(this.ctx.compiledGraph, hooks).then(
                    () => ({
                        status: "completed" as const,
                        duration: (performance.now() - start) / 1000
                    })
                ),

                this.createRejectionPromise(start)
            ])

            await this.services.lifecycleEffect.runEnding(result.status);

            return result;
        }
        catch (error) {
            await this.services.lifecycleEffect.runEnding("failed");

            throw error;
        }
        finally {
            this.ctx.proxyAPI.destroyAll();
        }
    }



    private createRejectionPromise(start: number){

        return new Promise<AggexEngine.Execution.Result>((resolve, reject) => {

            this.ctx.abortAPI.signal.addEventListener("abort", () => {

                // An intentional stop, not a termination.
                const stoppedAtTarget = this.ctx.abortAPI.signal.reason === AggexEngine.STOP_AT_TARGET_REASON;

                resolve({
                    status: stoppedAtTarget ? "completed" as const : "terminated" as const,
                    duration: (performance.now() - start) / 1000
                });

            }, { once: true })
        })
    }



    public pause(){

        if(this.pausePromise)
            return

        this.pausePromise = new Promise((resolve) => {
            this.pauseResolve = resolve;
        })
    }



    public resume(){

        if(!this.pausePromise || !this.pauseResolve)
            return;

        this.hooks.onResume?.();
        this.pauseResolve();
        this.pauseResolve = null;
        this.pausePromise = null;
    }



    private async awaitPause() {

        if(!this.pausePromise)
            return

        if(this.ctx.activeNodes.size === 0)
            this.hooks.onPause?.();

        await this.pausePromise;
    }



    private onNodeFired(
        nodeId: Vertex.Id,
    ): void {

        const entry = this.ctx.nodeRuntimeMap.get(nodeId);

        if (!entry)
            return;

        this.flightRecorder?.onNodeFired(entry.wfNode.id);

        this.ctx.activeNodes.add(nodeId);

        this.services.session.onNodeFired(entry);
    }



    private onNodeExecuted = async (
        vertexId: Vertex.Id,
        signals:  Set<Workflow.Node.Id | Vertex.Id>
    ): Promise<Set<Vertex.Id> | void> => {

        const entry = this.ctx.nodeRuntimeMap.get(vertexId);

        if (!entry)
            return;

        const wfNode       = entry.wfNode;
        const nodeInstance = entry.instance;

        // An upstream node failed with `propagate` — catch or re-propagate instead of running.
        const intercepted = this.services.errors.interceptIncoming(vertexId, nodeInstance);

        if (intercepted)
            return intercepted;

        const allDependencies = this.ctx.compiledGraph.dependenciesMap.get(vertexId)!;
        const dataDependency  = frameworkFields(entry.instance)["dataDependency" as Field.Id];

        let result;
        let projectedResult;

        try {
            const inputs = this.services.nodeIO.getIncomingData(
                                wfNode.id,
                                dataDependency === "AND" ? allDependencies : signals
                            );

            // Expressions run in the airlock; a throw/timeout is the node's failure
            // (→ onErrorStrategy), an OOM force-terminates (handled in handleNodeError).
            const fields = nodeInstance.evaluateFieldValues(inputs);

            System.log.debug("node executing", {
                nodeId:         wfNode.id,
                dataDependency: dataDependency ?? "OR",
                signals:        [...signals],
                deps:           [...allDependencies],
                inputPorts:     Object.keys(inputs),
            });

            this.flightRecorder?.onNodeExecuted(wfNode.id, signals, allDependencies, inputs, fields);

            const isTool = frameworkFields(nodeInstance)["isConvertedToTool" as Field.Id] === true;

            if(isTool)
                result = await nodeInstance.buildTool(inputs, fields);
            else
                result = await nodeInstance.run(inputs, fields);

            projectedResult = this.services.nodeIO.projectOutputs(result, wfNode);
        }
        catch (err) {
            // Input resolution, expression eval, execution and projection share one failure boundary.
            return this.services.errors.handle(vertexId, err);
        }

        this.services.session.onNodeExecuted(wfNode.id, result, projectedResult);

        switch (nodeInstance.getPropagationStrategy()) {
            case "router": return this.services.routing.resolveRouterSignals(wfNode.id, result)
            case "none":   return new Set<Vertex.Id>()   // empty set → fireVertexDependents signals nobody
            case "all":    return                        // void → fireVertexDependents signals all
        }
    }



    private async onNodeCompleted(
        vertexId:          Vertex.Id,
        resolvedOutSignals:Set<Vertex.Id> | void,
    ) {
        this.ctx.activeNodes.delete(vertexId);

        const entry = this.ctx.nodeRuntimeMap.get(vertexId);

        if (!entry)
            return

        // Errored nodes already recorded "failed" and handled their own propagation — don't
        // overwrite that. S2 still drives any returned signal set after this.
        if (this.ctx.session.node_status[entry.wfNode.id]?.status === "failed") {
            await this.awaitPause();
            return;
        }

        this.services.session.onNodeCompleted(entry, resolvedOutSignals);

        this.flightRecorder?.onNodeCompleted(entry.wfNode.id);

        // The target ran and its output is persisted + emitted — stop the rest of the workflow.
        if (this.ctx.stopAtNodeId === entry.wfNode.id)
            this.ctx.abortAPI.abort(AggexEngine.STOP_AT_TARGET_REASON);

        await this.awaitPause();
    }



    private onNodeWaiting(
        vertexId:                Vertex.Id,
        arrivedSignals:          Set<Vertex.Id>,
        dependencyResolutionMap: Record<Vertex.Id, boolean>,
        _totalDeps:              number,
    ) {
        const entry = this.ctx.nodeRuntimeMap.get(vertexId);

        if (!entry)
            return

        const { instance, wfNode } = entry;

        const nodeDepMap: Record<Workflow.Node.Id, boolean> = {};

        Object.entries(dependencyResolutionMap).forEach(([_depId, resolved]) => {
            const depId = _depId as unknown as Workflow.Node.Id;
            nodeDepMap[depId] = resolved;
        })

        System.log.debug("node waiting on dependencies", {
            nodeId:     wfNode.id,
            arrived:    [...arrivedSignals],
            resolution: nodeDepMap,
        });

        this.services.session.onNodeWaiting(wfNode.id);

        const partialInputs = this.services.nodeIO.getIncomingData(wfNode.id, arrivedSignals);

        let partialFields;

        try {
            partialFields = instance.evaluateFieldValues(partialInputs);
        }
        catch (err) {
            this.services.errors.handle(vertexId, err);  // OOM → throws (terminate); else recorded
            return;
        }

        instance.wait(partialInputs, nodeDepMap, partialFields);
    }



    // Only reached when a throw escapes to S2 (`terminate` strategy, or a terminal/cyclic
    // UncaughtRuntimeNodeError). The run is already rejecting; just record it.
    private onNodeError(
        vertexId: Vertex.Id,
        error:    unknown,
    ) {
        System.log.error("node errored (reached S2)", {
            nodeId: vertexId,
            error:  error instanceof Error ? error.message : String(error),
        });

        // Preserve an existing SystemError; wrap anything else.
        const aggexError = error instanceof SystemError
            ? error
            : new AggexExecutionError(
                SystemError.Code.EXECUTION_NODE_FAILED,
                error instanceof Error ? error.message : String(error),
            )

        this.services.errors.record(vertexId as unknown as Workflow.Node.Id, aggexError.toJSON());
    }



    private canNodeRun(
        vertexId:          Vertex.Id,
        receivedSignals:   Set<Vertex.Id>,
        s2EngineAssesment: boolean
    ): boolean {

        const entry = this.ctx.nodeRuntimeMap.get(vertexId);

        if (!entry)
            return true;

        // Fail-fast: an error envelope bypasses every gate so the node fires immediately rather
        // than waiting on sibling inputs that will never arrive.
        if (this.services.errors.findIncomingEnvelope(vertexId))
            return true;

        return this.services.routing.canRunByDependencies(vertexId);
    }
}



export namespace AggexEngine {

    export interface Options extends ExecutionContext.Options {
        hooks?: AggexHooks;
    }

    export namespace Execution {

        export type Result = {
            status: "completed" | "terminated";
            duration: number;
        }

        /** In-flight error travelling out-of-band (NOT through typed ports), keyed by edge in
         *  ctx.errorChannel. `path` is the ordered node trace, used for cycle detection. */
        export interface ErrorEnvelope {
            id:    string;
            error: SystemError.Serialized;
            path:  Workflow.Node.Id[];
        }

    }
}
