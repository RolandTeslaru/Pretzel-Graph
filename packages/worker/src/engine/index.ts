import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { S2Engine } from "../S2/engine";
import { S2Graph, Vertex } from "../S2/graph";
import { Synthesizer } from "@pretzel-graph/node-sdk";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { S2Hooks } from "src/S2/types";
import { AggexExecutionError, UncaughtRuntimeNodeError, CyclicalRuntimeNodeError } from "src/errors";
import { AirlockTerminationError } from "src/airlock";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { Projection } from "@pretzel-graph/shared/domain/Foundations/Projection";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Execution } from "@pretzel-graph/shared/domain";
import { FlightRecorderService } from "./flight-recorder-service";
import { System } from "@pretzel-graph/shared/system";

export interface AggexHooks {
    onPause?(): void;
    onResume?(): void;
}

export class AggexEngine {
    /** Abort reason marking an intentional "execute up until this point" stop (vs a real termination). */
    public static readonly STOP_AT_TARGET_REASON = "stop_at_target";

    private s2Engine:        S2Engine = new S2Engine();
    private flightRecorder:  FlightRecorderService | null = null;

    private pausePromise: Promise<void> | null = null;
    private pauseResolve: (() => void) | null = null;

    private hooks: AggexHooks;

    private nodeRuntimeMap = new Map<Vertex.Id, { wfNode: Workflow.Node; instance: RuntimeNode<Blueprint> }>();

    public registerNode(vertexId: Vertex.Id | Workflow.Node.Id, wfNode: Workflow.Node, instance: RuntimeNode<Blueprint>): void {
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


    // Port API

    public readonly portAPI = {
        write: (
            ctx:      AggexEngine.Execution.Context,
            nodeId:   Workflow.Node.Id,
            outputId: Port.Output.Id,
            value:    unknown,
        ) => {
            const outputPort = this.getOutputPort(ctx, nodeId, outputId);

            const projection = Synthesizer.project(value, outputPort.variant);

            ctx.updateSession(d => {
                d.node_output_instances[nodeId] ??= {};
                d.node_output_projections[nodeId] ??= {};

                d.node_output_instances[nodeId][outputId] = value;
                d.node_output_projections[nodeId][outputId] = projection;
            });

            ctx.emit<Execution.Event.SessionUpdate>({
                executionId: ctx.executionId,
                workflowId:  ctx.workflowId,
                type:        "update",
                channel:     this.getEventChannel(ctx),
                sessionUpdate: {
                    node_output_projections: {
                        [nodeId]: {
                            [outputId]: projection,
                        },
                    },
                },
            });
        },
    }

    public readonly propagationAPI = {
        emitPort: (
            ctx:      AggexEngine.Execution.Context,
            nodeId:   Workflow.Node.Id,
            outputId: Port.Output.Id,
        ) => {
            const edges = Object.values(ctx.workflowData.edges).filter(edge =>
                edge.source.nodeId === nodeId &&
                edge.source.portId === outputId
            );

            const edgeIds: Record<string, Workflow.Edge.Id> = {};
            for (const edge of edges)
                edgeIds[edge.id] = edge.id;

            const edgeStateUpdate = this.session.createEdgeStateUpdate(
                ctx,
                edgeIds,
                "waiting",
                state => { state.runCount += 1; },
            );

            for (const edge of edges)
                this.schedulerAPI.signalNode(ctx, edge.target.nodeId, nodeId);

            ctx.emit<Execution.Event.SessionUpdate>({
                executionId: ctx.executionId,
                workflowId:  ctx.workflowId,
                type:        "update",
                channel:     this.getEventChannel(ctx),
                sessionUpdate: {
                    edge_state: edgeStateUpdate,
                },
            });
        },
        emitNode: (
            ctx:    AggexEngine.Execution.Context,
            nodeId: Workflow.Node.Id,
        ) => {
            const node = ctx.workflowData.nodes[nodeId];
            if (!node) return;

            const allEdgeIds: Record<string, Workflow.Edge.Id> = {};

            for (const output of node.outputs)
                for (const edge of Object.values(ctx.workflowData.edges)) 
                    if (edge.source.nodeId === nodeId && edge.source.portId === output.id)
                        allEdgeIds[edge.id] = edge.id;

            const edgeStateUpdate = this.session.createEdgeStateUpdate(
                ctx,
                allEdgeIds,
                "waiting",
                state => { state.runCount += 1; },
            );

            for (const edgeId of Object.values(allEdgeIds)) {
                const edge = ctx.workflowData.edges[edgeId];

                this.schedulerAPI.signalNode(ctx,edge.target.nodeId,nodeId,);
            }

            ctx.emit<Execution.Event.SessionUpdate>({
                executionId: ctx.executionId,
                workflowId:  ctx.workflowId,
                type:        "update",
                channel:     this.getEventChannel(ctx),
                sessionUpdate: {
                    edge_state: edgeStateUpdate,
                },
            });
        },
    }



    public readonly schedulerAPI = {
        fireNode: (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id, signals: Set<Workflow.Node.Id | Vertex.Id> = new Set()) => {
            this.s2Engine.overrides.fireVertex(nodeId as unknown as Vertex.Id, signals as Set<Vertex.Id>);
        },
        signalNode: (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id, fromNodeId: Workflow.Node.Id) => {
            this.s2Engine.overrides.addSignal(nodeId as unknown as Vertex.Id, fromNodeId as unknown as Vertex.Id);
        },
        removeSignal: (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id, fromNodeId: Workflow.Node.Id) => {
            this.s2Engine.overrides.removeSignal(nodeId as unknown as Vertex.Id, fromNodeId as unknown as Vertex.Id);
        },
        clearSignals: (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id) => {
            this.s2Engine.overrides.clearSignals(nodeId as unknown as Vertex.Id);
        },
        scheduleCheck: (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id) => {
            this.s2Engine.overrides.scheduleCheck(nodeId as unknown as Vertex.Id);
        },
    }



    private getEventChannel(ctx: AggexEngine.Execution.Context): Execution.Event.Channel{
        return Execution.Event.getChannel(ctx.executionId);
    }




    private resolveRouterSignals(
        ctx:    AggexEngine.Execution.Context,
        nodeId: Workflow.Node.Id,
        result: Record<string, any>
    ): Set<Vertex.Id> {
        const signals = new Set<Vertex.Id>();
        const edges = ctx.workflowData.edges;
        const returnedKeys = new Set(Object.keys(result));

        for (const edge of Object.values(edges))
            if (edge.source.nodeId === nodeId && returnedKeys.has(edge.source.portId))
                signals.add(edge.target.nodeId as unknown as Vertex.Id);

        return signals;
    }



    private readonly node = {
        getIncomingData: (
            ctx:             AggexEngine.Execution.Context,
            nodeId:          Workflow.Node.Id,
            incomingSignals: Set<Workflow.Node.Id | Vertex.Id> = new Set(),
            keepMissingPorts = false,
        ): Record<Port.Input.Id, any> => {
            const wfNode = ctx.workflowData.nodes[nodeId];
            const staticValues = ctx.workflowData.staticValues[nodeId] ?? {};

            const resolved: Record<Port.Input.Id, any> = {};

            const incomingEdgeByPort = ctx.workflowCache.inputHandlesMap[nodeId]

            for (const input of wfNode.inputs) {
                const edgeId = incomingEdgeByPort[input.id]
                const edge = ctx.workflowData.edges[edgeId];

                if (edge) {
                    if(incomingSignals.has(edge.source.nodeId) === false){
                        if(keepMissingPorts)
                            resolved[input.id] = undefined;
                        continue;
                    }
                    
                    const sourceOutputs = ctx.session.node_output_instances[edge.source.nodeId];
                    if (sourceOutputs) {
                        const rawReference = sourceOutputs[edge.source.portId as string];
                        // undefined = nothing produced yet (keep waiting).
                        // null      = produced-but-empty, only ExposeInputPort emits it (settled).
                        // Keep them distinct; null bypasses ensureReference (which would throw).
                        if(rawReference === undefined)
                            resolved[input.id] = undefined;
                        else if(rawReference === null)
                            resolved[input.id] = null;
                        else
                            resolved[input.id] = Synthesizer.ensureReference(rawReference, input.variant);
                    }
                    else {
                        resolved[input.id] = undefined;
                    }
                } else {
                    const staticValue = staticValues[input.id];
                    const fallback = "initialValue" in input ? input.initialValue : undefined;
                    const raw = staticValue ?? fallback;

                    if (raw !== undefined) {
                        resolved[input.id] = raw as Field.Value;
                    }
                    else {
                        resolved[input.id] = undefined;
                    }
                }
            }

            return resolved;
        },
        projectOutputs: (
            result: Record<string, any>,
            wfNode: Workflow.Node
        ): Record<Port.Output.Id, Projection> => {
            const projected: Record<Port.Output.Id, Projection> = {};

            for (const output of wfNode.outputs) {
                const key = output.id;
                if (key in result){
                    if(result[key] === undefined)
                        projected[key] = undefined as unknown as Projection;
                    else
                        projected[key] = Synthesizer.project(result[key], output.variant);
                }
            }

            return projected;
        }
    }



    private readonly session = {
        /**
         * Mutates edge states in the session and returns the updated entries for event emission.
         * @param edgeIds   — edge ID map from the workflow cache
         * @param status    — the status to set on each edge
         * @param onUpdate  — optional callback applied to each edge state after status is set (e.g. runCount increment)
         */
        createEdgeStateUpdate: (
            
            ctx:       AggexEngine.Execution.Context,
            edgeIds:   Record<string, Workflow.Edge.Id>,
            status:    Execution.Session.EdgeState["status"],
            onUpdate?: (state: Execution.Session.EdgeState) => void,

        ): Execution.Session["edge_state"] => {
            ctx.updateSession(d => {
                if (!d.edge_state)
                    d.edge_state = {};

                for (const edgeId of Object.values(edgeIds)) {
                    if (!d.edge_state[edgeId])
                        d.edge_state[edgeId] = { status, runCount: 0 };
                    else
                        d.edge_state[edgeId].status = status;

                    if (onUpdate)
                        onUpdate(d.edge_state[edgeId]);
                }
            });

            const update: Execution.Session["edge_state"] = {};
            for (const edgeId of Object.values(edgeIds))
                update[edgeId] = ctx.session.edge_state[edgeId];

            return update;
        }
    }



    private onNodeFired(
        ctx:    AggexEngine.Execution.Context,
        nodeId: Vertex.Id,
    ): void {
        const { workflowCache } = ctx

        const entry = this.nodeRuntimeMap.get(nodeId);
        if (!entry)
            return;

        const edgeStateUpdate: Execution.Session["edge_state"] = {};

        // Set all incoming (dependency) edges to completed
        const incomingEdges = workflowCache.incomingEdgesMap[entry.wfNode.id];
        if (incomingEdges)
            Object.assign(
                edgeStateUpdate, 
                this.session.createEdgeStateUpdate(ctx, incomingEdges, "completed")
            );

        // Set all outgoing edges to preparing.
        // Skip for "router" — we don't know which branch will be taken yet.
        // Skip for "none"   — the node manages its own propagation and edge state.
        if (entry.instance.getPropagationStrategy() === "all") {
            const outgoingEdges = workflowCache.outgoingEdgesMap[entry.wfNode.id];

            if (outgoingEdges)
                Object.assign(
                    edgeStateUpdate,
                    this.session.createEdgeStateUpdate(ctx, outgoingEdges, "preparing")
                );
        }

        // System.log.debug("node fired", {
        //     name:        entry.wfNode.displayName,
        //     nodeId:      entry.wfNode.id,
        //     propagation: entry.instance.getPropagationStrategy(),
        // });

        this.flightRecorder?.onNodeFired(entry.wfNode.id);

        ctx.activeNodes.add(nodeId)

        const nodeStatus: Execution.Session.NodeStatus = {
            status: "running",
            started_at: new Date().toISOString(),
        };

        const nodeStatusUpdate = { [entry.wfNode.id]: nodeStatus };

        ctx.updateSession(d => {
            Object.assign(d.node_status, nodeStatusUpdate);
        });

        ctx.emit<Execution.Event.Node.Started>({
            executionId:   ctx.executionId,
            workflowId:    ctx.workflowId,
            type:          "node:started",
            nodeId:        entry.wfNode.id,
            channel:       this.getEventChannel(ctx),
            sessionUpdate: {
                edge_state:  edgeStateUpdate,
                node_status: nodeStatusUpdate,
            },
        });
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

        // ── Error interception ──────────────────────────────────────────────
        // An error envelope on an incoming edge means an upstream node failed with
        // `propagate`. This node does NOT run its own logic — it either catches the
        // error (Catch node → materialize to `onError`) or re-propagates it.
        const incomingEnvelope = this.findIncomingErrorEnvelope(ctx, vertexId);
        if (incomingEnvelope) {
            this.consumeIncomingEnvelopes(ctx, vertexId);   // delivered — clear from channel

            // Concrete nodes expose `Blueprint` (with `flags`); the abstract base doesn't
            // declare it, so read it through a narrow cast rather than churning all nodes.
            const blueprint = (entry.instance as { Blueprint?: Blueprint }).Blueprint;
            if (blueprint?.flags?.catchesError === true)
                return this.materializeCaughtError(ctx, vertexId, incomingEnvelope);

            return this.propagateError(ctx, vertexId, incomingEnvelope);
        }

        const allDependencies = ctx.compiledGraph.dependenciesMap.get(vertexId)!;

        const dataDependency = entry.instance.fields["dataDependency" as Field.Id];

        const inputs = this.node.getIncomingData(
            ctx,
            wfNode.id,
            dataDependency === "AND" ? allDependencies : signals
        );

        let fields;
        try {
            // Field expressions run in the airlock; a throw/timeout here is the node's
            // failure (→ onErrorStrategy), an OOM force-terminates (handled in handleNodeError).
            fields = nodeInstance.evaluateFields(inputs);
        } catch (err) {
            return this.handleNodeError(ctx, vertexId, err);
        }

        System.log.debug("node executing", {
            name:           wfNode.displayName,
            nodeId:         wfNode.id,
            dataDependency: dataDependency ?? "OR",
            signals:        [...signals],
            deps:           [...allDependencies],
            inputPorts:     Object.keys(inputs),
        });

        this.flightRecorder?.onNodeExecuted(wfNode.id, signals, allDependencies, inputs, fields, ctx);

        const isTool = nodeInstance.fields["isConvertedToTool" as Field.Id] === true;

        let result;
        try {
            if(isTool)
                result = await nodeInstance.buildTool(inputs, fields);
            else
                result = await nodeInstance.run(inputs, fields);
        } catch (err) {
            // The node's own execution threw — apply its `onErrorStrategy`.
            return this.handleNodeError(ctx, vertexId, err);
        }

        const projectedResult = this.node.projectOutputs(result, wfNode);

        ctx.updateSession(d => {
            d.node_output_instances[wfNode.id] = {
                ...(d.node_output_instances[wfNode.id] ?? {}),
                ...result,
            };
            d.node_output_projections[wfNode.id] = {
                ...(d.node_output_projections[wfNode.id] ?? {}),
                ...projectedResult,
            };
        });

        switch (nodeInstance.getPropagationStrategy()) {
            case "router": return this.resolveRouterSignals(ctx, wfNode.id, result)
            case "none":   return new Set<Vertex.Id>()   // empty set → fireVertexDependents signals nobody
            case "all":    return                         // void → fireVertexDependents signals all
        }
    }




    private async onNodeCompleted(
        ctx:               AggexEngine.Execution.Context,
        vertexId:          Vertex.Id,
        resolvedOutSignals:Set<Vertex.Id> | void,
    ) {
        const { session, workflowCache } = ctx

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

        // Set outgoing edges to waiting and increment runCount
        // For router nodes, only update edges for the taken branches
        const allOutgoingEdges = workflowCache.outgoingEdgesMap[entry.wfNode.id];
        let edgeStateUpdate: Execution.Session["edge_state"] = {};

        if (allOutgoingEdges) {
            const strategy = entry.instance.getPropagationStrategy();

            if (strategy === "router" && resolvedOutSignals) {
                // Only mark edges for the taken branches
                const takenEdges: Record<string, Workflow.Edge.Id> = {};
                for (const [targetId, edgeId] of Object.entries(allOutgoingEdges)) {
                    if (resolvedOutSignals.has(targetId as unknown as Vertex.Id))
                        takenEdges[targetId] = edgeId;
                }
                edgeStateUpdate = this.session.createEdgeStateUpdate(ctx, takenEdges, "waiting", s => { s.runCount += 1; });
            } else if (strategy === "none") {
                // Node managed its own edge state via propagationAPI — nothing to do
            } else {
                edgeStateUpdate = this.session.createEdgeStateUpdate(ctx, allOutgoingEdges, "waiting", s => { s.runCount += 1; });
            }
        }

        const existing = ctx.session.node_status[entry.wfNode.id];
        const nodeStatus: Execution.Session.NodeStatus = {
            status:       "completed",
            started_at:   existing?.started_at,
            completed_at: new Date().toISOString(),
        };
        const projectedOutput = session.node_output_projections[entry.wfNode.id];
        const nodeStatusUpdate = { [entry.wfNode.id]: nodeStatus };

        ctx.updateSession(d => {
            d.edge_state = { ...d.edge_state, ...edgeStateUpdate };
            Object.assign(d.node_status, nodeStatusUpdate);
        });

        ctx.emit<Execution.Event.Node.Completed>({
            executionId:   ctx.executionId,
            workflowId:    ctx.workflowId,
            type:          "node:completed",
            nodeId:        entry.wfNode.id,
            channel:       this.getEventChannel(ctx),
            output:        projectedOutput,
            sessionUpdate: {
                edge_state: edgeStateUpdate,
                node_status: nodeStatusUpdate,
                node_output_projections: {
                    [entry.wfNode.id]: projectedOutput,
                },
            },
        });

        System.log.info("node completed", {
            name:        entry.wfNode.displayName,
            nodeId:      entry.wfNode.id,
            outputPorts: projectedOutput ? Object.keys(projectedOutput) : [],
        });

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

        const existing = ctx.session.node_status[wfNode.id];
        const nodeStatus: Execution.Session.NodeStatus = {
            status: "waiting",
            started_at: existing?.started_at,
        };

        const nodeStatusUpdate = { [wfNode.id]: nodeStatus };

        ctx.updateSession(d => {
            Object.assign(d.node_status, nodeStatusUpdate);
        });

        ctx.emit<Execution.Event.Node.Waiting>({
            executionId:   ctx.executionId,
            workflowId:    ctx.workflowId,
            type:          "node:waiting",
            nodeId:        wfNode.id,
            channel:       this.getEventChannel(ctx),
            sessionUpdate: {
                node_status: nodeStatusUpdate,
            },
        });

        const partialInputs = this.node.getIncomingData(ctx, wfNode.id, arrivedSignals);
        let partialFields;
        try {
            partialFields = instance.evaluateFields(partialInputs);
        } catch (err) {
            this.handleNodeError(ctx, vertexId, err);  // OOM → throws (terminate); else recorded
            return;
        }
        instance.wait(partialInputs, nodeDepMap, partialFields);
    }




    /**
     * S2 `onVertexError` hook — fires only when a node throw reaches S2 (i.e. the
     * `terminate` strategy, or a terminal/cyclic `UncaughtRuntimeNodeError`). The
     * run is already rejecting; we just record the failure.
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

        this.recordNodeError(ctx, vertexId as unknown as Workflow.Node.Id, aggexError.toJSON());
    }


    /** Records a node as `failed` in the session + emits `node:error`. Shared by the
     *  S2 error hook (terminate) and the inline strategy handler (do_nothing/propagate). */
    private recordNodeError(
        ctx:    AggexEngine.Execution.Context,
        nodeId: Workflow.Node.Id,
        error:  SystemError.Serialized,
    ) {
        this.flightRecorder?.onNodeFailed(nodeId, ctx);

        const existing = ctx.session.node_status[nodeId];
        const nodeStatus: Execution.Session.NodeStatus = {
            status: "failed",
            started_at: existing?.started_at,
            completed_at: new Date().toISOString(),
            error: error as any,
        };

        const nodeStatusUpdate = { [nodeId]: nodeStatus };

        ctx.updateSession(d => {
            Object.assign(d.node_status, nodeStatusUpdate);
        });

        ctx.emit<Execution.Event.Node.Error>({
            executionId:   ctx.executionId,
            workflowId:    ctx.workflowId,
            type:          "node:error",
            nodeId:        nodeId,
            channel:       this.getEventChannel(ctx),
            error:         error,
            sessionUpdate: {
                node_status: nodeStatusUpdate,
            },
        })
    }


    /**
     * A node's own execution threw. Branch on its `onErrorStrategy` field:
     *   - `terminate` (default) → re-throw so S2 rejects the whole run (`onNodeError` records it).
     *   - `do_nothing`          → record + emit, fire nobody (downstream stalls). Partial run.
     *   - `propagate`           → record + emit, then send an error envelope down every outgoing edge.
     */
    private handleNodeError(
        ctx:      AggexEngine.Execution.Context,
        vertexId: Vertex.Id,
        error:    unknown,
    ): Set<Vertex.Id> | void {
        const entry = this.nodeRuntimeMap.get(vertexId);
        const nodeId = vertexId as unknown as Workflow.Node.Id;

        const aggexError = error instanceof SystemError
            ? error
            : new AggexExecutionError(
                SystemError.Code.EXECUTION_NODE_FAILED,
                error instanceof Error ? error.message : String(error),
            );

        // OOM disposed the shared airlock isolate — it's unrecoverable and every scope is
        // dead. Force-terminate regardless of the node's onErrorStrategy (do_nothing/propagate
        // would just cascade the same failure into every subsequent node).
        if (error instanceof AirlockTerminationError)
            throw aggexError;

        const strategy = entry?.instance.fields["onErrorStrategy" as Field.Id] ?? "terminate";

        switch (strategy) {
            case "terminate": { 
                throw aggexError;
            }
            case "do_nothing":
                System.log.warning("node failed; swallowed (onErrorStrategy=do_nothing)", {
                    nodeId,
                    error: aggexError.message,
                });
                this.recordNodeError(ctx, nodeId, aggexError.toJSON());
                return new Set<Vertex.Id>();   // fire nobody
            default:
            case "propagate":
                const envelope: AggexEngine.Execution.ErrorEnvelope = {
                    id:    crypto.randomUUID(),
                    error: aggexError.toJSON(),
                    path:  [],
                };
                return this.propagateError(ctx, vertexId, envelope);
        }
    }


    /**
     * Send `envelope` down every wired outgoing edge of this node and fire those
     * targets. Used both at the origin (fresh envelope) and for pass-through nodes
     * re-emitting a received envelope. Returns the set of target vertices to fire
     * (router-style); the carrying node is recorded `failed` so the path lights up.
     *
     * Throws (→ terminate) when:
     *   - the envelope's `path` already contains this node → `CyclicalUncaughtRuntimeNodeError`
     *   - this node has no wired outgoing edges → `UncaughtRuntimeNodeError`
     */
    private propagateError(
        ctx:      AggexEngine.Execution.Context,
        vertexId: Vertex.Id,
        envelope: AggexEngine.Execution.ErrorEnvelope,
    ): Set<Vertex.Id> {
        const nodeId = vertexId as unknown as Workflow.Node.Id;

        // Cycle: the error looped back onto a node already in its own path.
        if (envelope.path.includes(nodeId))
            throw new CyclicalRuntimeNodeError(
                `Error cycled back onto node "${nodeId}": ${envelope.error.message}`,
                [...envelope.path, nodeId] as unknown as string[],
            );

        const outgoing = ctx.workflowCache.outgoingEdgesMap[nodeId];
        const wiredEdgeIds = outgoing ? Object.values(outgoing) : [];

        // Terminal: nowhere left to forward → the error was never caught.
        if (wiredEdgeIds.length === 0)
            throw new UncaughtRuntimeNodeError(
                `Uncaught node error reached terminal node "${nodeId}": ${envelope.error.message}`,
                [...envelope.path, nodeId] as unknown as string[],
            );

        // This node is now carrying the error.
        this.recordNodeError(ctx, nodeId, envelope.error);

        const nextEnvelope: AggexEngine.Execution.ErrorEnvelope = {
            ...envelope,
            path: [...envelope.path, nodeId],
        };

        const edgeIdMap: Record<string, Workflow.Edge.Id> = {};
        const targets = new Set<Vertex.Id>();

        for (const edgeId of wiredEdgeIds) {
            ctx.errorChannel.set(edgeId, nextEnvelope);
            edgeIdMap[edgeId] = edgeId;
            const edge = ctx.workflowData.edges[edgeId];
            if (edge) 
                targets.add(edge.target.nodeId as unknown as Vertex.Id);
        }

        const edgeStateUpdate = this.session.createEdgeStateUpdate(
            ctx, edgeIdMap, "waiting", s => { s.runCount += 1; },
        );

        ctx.emit<Execution.Event.SessionUpdate>({
            executionId:   ctx.executionId,
            workflowId:    ctx.workflowId,
            type:          "update",
            channel:       this.getEventChannel(ctx),
            sessionUpdate: { edge_state: edgeStateUpdate },
        });

        return targets;   // fireVertexDependents fires only these
    }


    /**
     * A Catch node received an error envelope: materialize the serialized error onto
     * its `onError` output port (so downstream gets it as `Data`) and fire only that
     * branch. The envelope was already consumed from the channel, so propagation
     * stops here. The node completes normally (it succeeded at catching).
     */
    private materializeCaughtError(
        ctx:      AggexEngine.Execution.Context,
        vertexId: Vertex.Id,
        envelope: AggexEngine.Execution.ErrorEnvelope,
    ): Set<Vertex.Id> {
        const nodeId = vertexId as unknown as Workflow.Node.Id;
        const onErrorPort = "onError" as Port.Output.Id;

        this.portAPI.write(ctx, nodeId, onErrorPort, envelope.error);

        return this.resolveRouterSignals(ctx, nodeId, { [onErrorPort]: envelope.error });
    }


    /** First error envelope sitting on any of this node's incoming edges, if any. */
    private findIncomingErrorEnvelope(
        ctx:      AggexEngine.Execution.Context,
        vertexId: Vertex.Id,
    ): AggexEngine.Execution.ErrorEnvelope | undefined {
        const incoming = ctx.workflowCache.inputHandlesMap[vertexId as unknown as Workflow.Node.Id];
        if (!incoming) return undefined;

        for (const edgeId of Object.values(incoming)) {
            const envelope = ctx.errorChannel.get(edgeId);
            if (envelope) return envelope;
        }
        return undefined;
    }


    /** Remove delivered envelopes from this node's incoming edges. */
    private consumeIncomingEnvelopes(
        ctx:      AggexEngine.Execution.Context,
        vertexId: Vertex.Id,
    ): void {
        const incoming = ctx.workflowCache.inputHandlesMap[vertexId as unknown as Workflow.Node.Id];
        if (!incoming) return;

        for (const edgeId of Object.values(incoming))
            ctx.errorChannel.delete(edgeId);
    }




    private canNodeRun(
        ctx:               AggexEngine.Execution.Context,
        vertexId:          Vertex.Id,
        receivedSignals:   Set<Vertex.Id>,
        s2EngineAssesment: boolean
    ): boolean {
        const entry = this.nodeRuntimeMap.get(vertexId);
        if (!entry) return true;

        const { instance, wfNode } = entry;

        // Fail-fast: an incoming error envelope bypasses every data/signal gate so the
        // node fires immediately and re-propagates (or catches) rather than waiting on
        // sibling inputs that will never arrive.
        if (this.findIncomingErrorEnvelope(ctx, vertexId)) return true;

        const signalDep = instance.fields["signalDependency" as Field.Id];
        const dataDep   = instance.fields["dataDependency" as Field.Id];

        if(signalDep === "AND") 
            return true;

        if(dataDep === "AND"){
            // Wait only while a wired port has NOT received data yet (=== undefined).
            //   undefined → nothing produced yet            → keep waiting
            //   null      → nothing will come               → settled, proceed
            //   any value → arrived                         → proceed
            // A router-skipped branch leaves its port undefined and never signals;
            // the node stays waiting and the engine settles once nothing can run.
            const dependencies       = ctx.compiledGraph.dependenciesMap.get(vertexId)!;
            const incomingInputs     = this.node.getIncomingData(ctx, wfNode.id, dependencies, true);
            const incomingEdgeByPort = ctx.workflowCache.inputHandlesMap[wfNode.id];

            for (const portId in incomingInputs) {
                const edgeId  = incomingEdgeByPort?.[portId as Port.Input.Id];
                const isWired = !!edgeId && !!ctx.workflowData.edges[edgeId];

                if (isWired && incomingInputs[portId as Port.Input.Id] === undefined)
                    return false;
            }
        }

        return true;
    }



    // Selectors


    private getNode(ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id): Workflow.Node {
        const node = ctx.workflowData.nodes[nodeId];
            if (!node)
                throw new AggexExecutionError(
                    SystemError.Code.EXECUTION_NODE_FAILED,
                    `Cannot write output for unknown node "${nodeId}"`,
                );
        return node;
    }

    private getOutputPort(ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id, outputId: Port.Output.Id): Port.Output {
        const node = this.getNode(ctx, nodeId);

        const output = node.outputs.find(output => output.id === outputId);
        if (!output)
            throw new AggexExecutionError(
                SystemError.Code.EXECUTION_NODE_FAILED,
                `Cannot write unknown output port "${outputId}" on node "${nodeId}"`,
            );
        return output;
    }

    private getInputPort(ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id, inputId: Port.Input.Id): Port.Input {
        const node = this.getNode(ctx, nodeId);

        const input = node.inputs.find(input => input.id === inputId);
        if (!input)
            throw new AggexExecutionError(
                SystemError.Code.EXECUTION_NODE_FAILED,
                `Cannot read unknown input port "${inputId}" on node "${nodeId}"`,
            );
        return input;
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
         * re-appearing → `CyclicalUncaughtRuntimeNodeError`) and debugging.
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