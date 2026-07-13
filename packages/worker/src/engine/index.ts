/*
 * PretzelGraph — https://github.com/RolandTeslaru/Pretzel-Graph
 * PolyForm Noncommercial License 1.0.0. Commercial use requires a separate license.
 * PZG-src::9f3a1c
 */
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { S2Engine } from "../S2/engine";
import { S2Graph, Vertex } from "../S2/graph";
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
import { System } from "@pretzel-graph/shared/system";

export interface AggexHooks {
    onPause?(): void;
    onResume?(): void;
}

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
        session:     new SessionService(),
    };

    private pausePromise: Promise<void> | null = null;
    private pauseResolve: (() => void) | null = null;

    private hooks: AggexHooks;

    /** @internal — accessed by engine services (RoutingService). */
    public nodeRuntimeMap = new Map<Vertex.Id, { wfNode: Workflow.Node.Raw; instance: RuntimeNode<Blueprint> }>();

    public registerNode(vertexId: Vertex.Id | Workflow.Node.Id, wfNode: Workflow.Node.Raw, instance: RuntimeNode<Blueprint>): void {
        this.nodeRuntimeMap.set(vertexId as Vertex.Id, { wfNode, instance });
    }

    public readonly instanceRegistryAPI = {
        get:    (nodeId: Workflow.Node.Id): RuntimeNode<Blueprint> | undefined =>
            this.nodeRuntimeMap.get(nodeId as unknown as Vertex.Id)?.instance,
        getAll: (): RuntimeNode<Blueprint>[] =>
            Array.from(this.nodeRuntimeMap.values()).map(e => e.instance),
    }



    // Lifecycle



    public async run(

        ctx: AggexEngine.Execution.Context
    
    ): Promise<AggexEngine.Execution.Result> {
        ctx.activeNodes.clear();

        const hooks: S2Hooks = {
            onVertexExecute:   (...props: Parameters<S2Hooks["onVertexExecute"]>)   => this.onNodeExecuted(ctx, ...props),
            onVertexFired:     (...props: Parameters<S2Hooks["onVertexFired"]>)     => this.onNodeFired(ctx, ...props),
            onVertexCompleted: (...props: Parameters<S2Hooks["onVertexCompleted"]>) => this.onNodeCompleted(ctx, ...props),
            onVertexWaiting:   (...props: Parameters<S2Hooks["onVertexWaiting"]>)   => this.onNodeWaiting(ctx, ...props),
            onVertexError:     (...props: Parameters<S2Hooks["onVertexError"]>)     => this.onNodeError(ctx, ...props),
            canVertexRun:      (...props: Parameters<S2Hooks["canVertexRun"]>)      => this.canNodeRun(ctx, ...props),
        } as const

        const start = performance.now();

        const result =  await Promise.race<AggexEngine.Execution.Result>([

            this.s2Engine.ignite(ctx.compiledGraph, hooks).then(
                () => ({ 
                    status: "completed" as const, 
                    duration: (performance.now() - start) / 1000 
                })
            ),

            this.createRejectionPromise(ctx, start)
        ])

        return result;
    }



    private createRejectionPromise(ctx: AggexEngine.Execution.Context, start: number){
        return new Promise<AggexEngine.Execution.Result>((resolve, reject) => {
            ctx.abortAPI.signal.addEventListener("abort", () => {
                // A "stop at target" abort is an intentional, successful stop — not a
                // user/timeout termination — so surface it as completed.
                const stoppedAtTarget = ctx.abortAPI.signal.reason === AggexEngine.STOP_AT_TARGET_REASON;
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




    constructor(hooks: AggexHooks = {}) {
        this.hooks = hooks;
    }

    public attachFlightRecorder(recorder: FlightRecorderService): void {
        this.flightRecorder = recorder;
    }


    // Getters preserve the external contract (`engine.propagationAPI.*`, `engine.schedulerAPI.*`).
    public get propagationAPI() { return this.services.propagation; }
    public get schedulerAPI()   { return this.services.scheduler; }



    private onNodeFired(
        ctx:    AggexEngine.Execution.Context,
        nodeId: Vertex.Id,
    ): void {
        const entry = this.nodeRuntimeMap.get(nodeId);
        if (!entry)
            return;

        this.flightRecorder?.onNodeFired(entry.wfNode.id);
        ctx.activeNodes.add(nodeId);
        this.services.session.onNodeFired(ctx, entry);
    }




    private async awaitPause(ctx: AggexEngine.Execution.Context) {
        if(!this.pausePromise)
            return

        if(ctx.activeNodes.size === 0)
            this.hooks.onPause?.();

        await this.pausePromise;
    }
        



    private onNodeExecuted = async (
        ctx:      AggexEngine.Execution.Context,
        vertexId: Vertex.Id, 
        signals:  Set<Workflow.Node.Id | Vertex.Id>
    ): Promise<Set<Vertex.Id> | void> => {
        
        const entry = this.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return;

        const wfNode = entry.wfNode;
        const nodeInstance = entry.instance;

        // An incoming error envelope means an upstream node failed with `propagate`:
        // this node catches or re-propagates instead of running its own logic.
        const intercepted = this.services.errors.interceptIncoming(ctx, vertexId, nodeInstance);
        if (intercepted)
            return intercepted;

        const allDependencies = ctx.compiledGraph.dependenciesMap.get(vertexId)!;

        const dataDependency = entry.instance.fieldValues["dataDependency" as Field.Id];
        let result;
        let projectedResult;

        try {
            const inputs = this.services.nodeIO.getIncomingData(
                                ctx,
                                wfNode.id,
                                dataDependency === "AND" ? allDependencies : signals
                            );

            // Field expressions run in the airlock; a throw/timeout here is the node's
            // failure (→ onErrorStrategy), an OOM force-terminates (handled in handleNodeError).
            const fields = nodeInstance.evaluateFieldValues(inputs);

            System.log.debug("node executing", {
                nodeId:         wfNode.id,
                dataDependency: dataDependency ?? "OR",
                signals:        [...signals],
                deps:           [...allDependencies],
                inputPorts:     Object.keys(inputs),
            });

            this.flightRecorder?.onNodeExecuted(wfNode.id, signals, allDependencies, inputs, fields, ctx);

            const isTool = nodeInstance.fieldValues["isConvertedToTool" as Field.Id] === true;

            if(isTool)
                result = await nodeInstance.buildTool(inputs, fields);
            else
                result = await nodeInstance.run(inputs, fields);

            projectedResult = this.services.nodeIO.projectOutputs(ctx, result, wfNode);
        } catch (err) {
            // Treat input resolution, expression evaluation, node execution, and output
            // projection as one node-owned failure boundary.
            return this.services.errors.handle(ctx, vertexId, err);
        }

        this.services.session.onNodeExecuted(ctx, wfNode.id, result, projectedResult);

        switch (nodeInstance.getPropagationStrategy()) {
            case "router": return this.services.routing.resolveRouterSignals(ctx, wfNode.id, result)
            case "none":   return new Set<Vertex.Id>()   // empty set → fireVertexDependents signals nobody
            case "all":    return                        // void → fireVertexDependents signals all
        }
    }




    private async onNodeCompleted(
        ctx:               AggexEngine.Execution.Context,
        vertexId:          Vertex.Id,
        resolvedOutSignals:Set<Vertex.Id> | void,
    ) {
        ctx.activeNodes.delete(vertexId);

        const entry = this.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return

        // Errored nodes (do_nothing / propagate) were already recorded "failed" and
        // handled their own propagation. Don't overwrite that with "completed" or
        // re-touch edge state — but S2 still drives any returned signal set after this.
        if (ctx.session.node_status[entry.wfNode.id]?.status === "failed") {
            await this.awaitPause(ctx);
            return;
        }

        this.services.session.onNodeCompleted(ctx, entry, resolvedOutSignals);
        this.flightRecorder?.onNodeCompleted(entry.wfNode.id, ctx);

        // "Execute up until this point": the target ran and its output is now persisted +
        // emitted — stop the rest of the workflow.
        if (ctx.stopAtNodeId === entry.wfNode.id)
            ctx.abortAPI.abort(AggexEngine.STOP_AT_TARGET_REASON);

        await this.awaitPause(ctx);
    }




    private onNodeWaiting(
        ctx:                     AggexEngine.Execution.Context,
        vertexId:                Vertex.Id,
        arrivedSignals:          Set<Vertex.Id>,
        dependencyResolutionMap: Record<Vertex.Id, boolean>,
        _totalDeps:              number,
    ) {
        const entry = this.nodeRuntimeMap.get(vertexId);
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

        this.services.session.onNodeWaiting(ctx, wfNode.id);

        const partialInputs = this.services.nodeIO.getIncomingData(ctx, wfNode.id, arrivedSignals);

        let partialFields;

        try {
            partialFields = instance.evaluateFieldValues(partialInputs);
        } catch (err) {
            this.services.errors.handle(ctx, vertexId, err);  // OOM → throws (terminate); else recorded
            return;
        }
        instance.wait(partialInputs, nodeDepMap, partialFields);
    }




    /**
     * S2 `onVertexError` hook — fires only when a node throw reaches S2 (i.e. the
     * `terminate` strategy, or a terminal/cyclic `UncaughtRuntimeNodeError`). The
     * run is already rejecting; we just record the failure via ErrorService.
     */
    private onNodeError(
        ctx:      AggexEngine.Execution.Context,
        vertexId: Vertex.Id,
        error:    unknown,
    ) {
        System.log.error("node errored (reached S2)", {
            nodeId: vertexId,
            error:  error instanceof Error ? error.message : String(error),
        });

        // If the node already threw a SystemError (or subclass), preserve it.
        // Otherwise wrap the S2/unknown error into an AggexExecutionError.
        const aggexError = error instanceof SystemError
            ? error
            : new AggexExecutionError(
                SystemError.Code.EXECUTION_NODE_FAILED,
                error instanceof Error ? error.message : String(error),
            )

        this.services.errors.record(ctx, vertexId as unknown as Workflow.Node.Id, aggexError.toJSON());
    }




    private canNodeRun(
        ctx:               AggexEngine.Execution.Context,
        vertexId:          Vertex.Id,
        receivedSignals:   Set<Vertex.Id>,
        s2EngineAssesment: boolean
    ): boolean {
        const entry = this.nodeRuntimeMap.get(vertexId);
        if (!entry) return true;

        // Fail-fast: an incoming error envelope bypasses every data/signal gate so the
        // node fires immediately and re-propagates (or catches) rather than waiting on
        // sibling inputs that will never arrive.
        if (this.services.errors.findIncomingEnvelope(ctx, vertexId)) return true;

        return this.services.routing.canRunByDependencies(ctx, vertexId);
    }




}


export namespace AggexEngine {
    export namespace Execution {
        export type Result = {
            status: "completed" | "terminated";
            duration: number;
        }

        /**
         * An in-flight error travelling the graph out-of-band (NOT through typed
         * output ports). Keyed by edge in `ctx.errorChannel`. `path` is the ordered
         * trace of nodes the error has visited — used for cycle detection (a node
         * re-appearing → `CyclicalRuntimeNodeError`) and debugging.
         */
        export interface ErrorEnvelope {
            id:    string;
            error: SystemError.Serialized;
            path:  Workflow.Node.Id[];
        }

        export interface Context extends RuntimeNode.ExecutionContext {
            compiledGraph: S2Graph,
            activeNodes:   Set<Workflow.Node.Id | Vertex.Id>;
            /** Out-of-band error propagation channel, keyed by the edge the error travels. */
            errorChannel:  Map<Workflow.Edge.Id, ErrorEnvelope>;
            /**
             * "Execute up until this point": once this node completes, the run aborts. The
             * full graph compiles/runs normally (portals, cycles, sub-workflows resolve
             * natively); we just cap execution at the target. Undefined on a normal run.
             */
            stopAtNodeId?: Workflow.Node.Id;
        }

    }

    export type ExecutionContext = Execution.Context;
}
