import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { S2Engine } from "../S2/engine";
import { S2Graph, Vertex } from "../S2/graph";
import { Synthesizer } from "@pretzel-graph/node-sdk";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { S2Hooks } from "src/S2/types";
import { AggexExecutionError } from "src/errors";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { Projection } from "@pretzel-graph/shared/domain/Foundations/Projection";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Execution } from "@pretzel-graph/shared/domain";
import { FlightRecorderService } from "./flight-recorder-service";

export interface AggexHooks {
    onPause?(): void;
    onResume?(): void;
}

export class AggexEngine {
    private s2Engine:        S2Engine = new S2Engine();
    private flightRecorder:  FlightRecorderService | null = null;

    private pausePromise: Promise<void> | null = null;
    private pauseResolve: (() => void) | null = null;

    private hooks: AggexHooks;

    private nodeRuntimeMap = new Map<Vertex.Id, { wfNode: Workflow.Node; instance: RuntimeNode<Blueprint> }>();

    public registerNode(vertexId: Vertex.Id, wfNode: Workflow.Node, instance: RuntimeNode<Blueprint>): void {
        this.nodeRuntimeMap.set(vertexId, { wfNode, instance });
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

            new Promise((resolve, reject) => {
                ctx.abortAPI.signal.addEventListener("abort", () => {
                    resolve({
                        status: "terminated" as const,
                        duration: (performance.now() - start) / 1000
                });
                }, { once: true })
            })
        ])

        return result;
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

            for (const output of node.outputs) {
                for (const edge of Object.values(ctx.workflowData.edges)) {
                    if (edge.source.nodeId === nodeId && edge.source.portId === output.id)
                        allEdgeIds[edge.id] = edge.id;
                }
            }

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
                        if(!rawReference)
                            resolved[input.id] = undefined;
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

        const allDependencies = ctx.compiledGraph.dependenciesMap.get(vertexId)!; 

        const dataDependency = entry.instance.fields["dataDependency" as Field.Id];
        
        const inputs = this.node.getIncomingData(
            ctx,
            wfNode.id,
            dataDependency === "AND" ? allDependencies : signals
        );

        const fields = nodeInstance.evaluateFields(inputs);

        this.flightRecorder?.onNodeExecuted(wfNode.id, signals, allDependencies, inputs, fields, ctx);

        const isTool = nodeInstance.fields["isConvertedToTool" as Field.Id] === true;

        let result;
        if(isTool)
            result = await nodeInstance.buildTool(inputs, fields);
        else
            result = await nodeInstance.run(inputs, fields);

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

        this.flightRecorder?.onNodeCompleted(entry.wfNode.id, ctx);

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
        const partialFields = instance.evaluateFields(partialInputs);
        instance.wait(partialInputs, nodeDepMap, partialFields);
    }




    private onNodeError(
        ctx:      AggexEngine.Execution.Context,
        vertexId: Vertex.Id,
        error:    unknown,
    ) {
        console.error(`Error during node execution, ${vertexId}:`, error)

        // If the node already threw a SystemError (or subclass), preserve it.
        // Otherwise wrap the S2/unknown error into an AggexExecutionError.
        const aggexError = error instanceof SystemError
            ? error
            : new AggexExecutionError(
                SystemError.Code.EXECUTION_NODE_FAILED,
                error instanceof Error ? error.message : String(error),
            )

        const nodeId = vertexId as unknown as Workflow.Node.Id;

        this.flightRecorder?.onNodeFailed(nodeId, ctx);

        const existing = ctx.session.node_status[nodeId];
        const nodeStatus: Execution.Session.NodeStatus = {
            status: "failed",
            started_at: existing?.started_at,
            completed_at: new Date().toISOString(),
            error: aggexError.toJSON() as any,
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
            error:         aggexError.toJSON(),
            sessionUpdate: {
                node_status: nodeStatusUpdate,
            },
        })
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

        const signalDepField = instance.fields["signalDependency" as Field.Id];
        const dataDepField   = instance.fields["dataDependency" as Field.Id];

        if(signalDepField === "AND") return true;

        if(dataDepField === "AND"){
            // Block until every wired port has data.
            // "Wired" means an edge physically connects to that port — unwired optional ports are ignored.
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
    
        export interface Context extends RuntimeNode.ExecutionContext {
            compiledGraph: S2Graph,
            activeNodes:   Set<Workflow.Node.Id | Vertex.Id>;
        }

    }

    export type ExecutionContext = Execution.Context;
}