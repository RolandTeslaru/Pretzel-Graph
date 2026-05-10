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
import { NodeStatusManager } from "./node-status-manager";

export interface AggexHooks {
    onPause?(): void;
    onResume?(): void;
}

export class AggexEngine {
    private s2Engine: S2Engine = new S2Engine();

    private pausePromise: Promise<void> | null = null;
    private pauseResolve: (() => void) | null = null;

    private hooks: AggexHooks;




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




    private getEventChannel(ctx: AggexEngine.Execution.Context): Execution.Event.Channel{
        return Execution.Event.getChannel(ctx.executionId);
    }




    private projectOutputs(
        result: Record<string, any>,
        wfNode: Workflow.Node
    ): Record<Port.Output.Id, Projection> {
        const projected: Record<Port.Output.Id, Projection> = {};

        for (const output of wfNode.outputs) {
            const key = output.id;
            if (key in result)
                projected[key] = Synthesizer.project(result[key], output.variant);
        }

        return projected;
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




    private resolveInputs(
        ctx:             AggexEngine.Execution.Context,
        nodeId:          Workflow.Node.Id,
        incomingSignals: Set<Workflow.Node.Id | Vertex.Id> = new Set(),
        keepMissingPorts = false,
    ): Record<Port.Input.Id, any> {
        const node = ctx.workflowData.nodes[nodeId];
        const staticValues = ctx.workflowData.staticValues[nodeId] ?? {};

        const resolved: Record<Port.Input.Id, any> = {};

        const incomingEdgeByPort = ctx.workflowCache.inputHandlesMap[nodeId]

        for (const input of node.inputs) {
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
    }




    /**
     * Mutates edge states in the session and returns the updated entries for event emission.
     * @param edgeIds   — edge ID map from the workflow cache
     * @param status    — the status to set on each edge
     * @param onUpdate  — optional callback applied to each edge state after status is set (e.g. runCount increment)
     */
    private applyEdgeStateUpdate(

        ctx:       AggexEngine.Execution.Context,
        edgeIds:   Record<string, Workflow.Edge.Id>,
        status:    Execution.Session.EdgeState["status"],

        onUpdate?: (state: Execution.Session.EdgeState) => void,
    
    ): Execution.Session["edge_state"] {
    
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
    



    private onNodeFired(
        ctx:               AggexEngine.Execution.Context,
        nodeStatusManager: NodeStatusManager,
        nodeId:            Vertex.Id,
    ): void {
        const { workflowCache, nodeRuntimeMap } = ctx

        const entry = nodeRuntimeMap.get(nodeId);
        if (!entry)
            return;

        const edgeStateUpdate: Execution.Session["edge_state"] = {};

        // Set all incoming (dependency) edges to completed
        const incomingEdges = workflowCache.incomingEdgesMap[entry.wfNode.id];
        if (incomingEdges)
            Object.assign(
                edgeStateUpdate, 
                this.applyEdgeStateUpdate(ctx, incomingEdges, "completed")
            );

        // Set all outgoing edges to preparing (skip for router nodes — only the taken branch should light up)
        if (!('isRouterNode' in entry.instance)) {
            const outgoingEdges = workflowCache.outgoingEdgesMap[entry.wfNode.id];

            if (outgoingEdges)
                Object.assign(
                    edgeStateUpdate, 
                    this.applyEdgeStateUpdate(ctx, outgoingEdges, "preparing")
                );
        }

        ctx.activeNodes.add(nodeId)

        const nodeStatus: Execution.Session.NodeStatus = {
            status: "running",
            started_at: new Date().toISOString(),
        };

        const nodeStatusUpdate = nodeStatusManager.handleStatusSet(ctx.session, entry.wfNode.id, nodeStatus);

        ctx.updateSession(d => {
            Object.assign(d.node_status, nodeStatusUpdate);
        });

        console.log(`[Engine] node:started  ${entry.wfNode.id}`);
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
        
        const entry = ctx.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return;
        
        const wfNode = entry.wfNode;
        const nodeInstance = entry.instance;

        const allDependencies = ctx.compiledGraph.dependenciesMap.get(vertexId)!; 

        const dataDependency = entry.instance.fields["dataDependency" as Field.Id];
        
        const inputs = this.resolveInputs(
            ctx, 
            wfNode.id, 
            dataDependency === "AND" ? allDependencies : signals
        );

        const isTool = nodeInstance.fields["isConvertedToTool" as Field.Id] === true;

        let result;
        if(isTool)
            result = await nodeInstance.buildTool(inputs);
        else
            result = await nodeInstance.run(inputs);

        ctx.updateSession(d => {
            d.node_output_instances[wfNode.id] = result;
            d.node_output_projections[wfNode.id] = this.projectOutputs(result, wfNode);
        });
        console.log(`[Engine] node:executed ${wfNode.id} — session node_output_projections keys: ${Object.keys(ctx.session.node_output_projections).join(', ') || '(none)'}`);
            
        if ('isRouterNode' in nodeInstance)
            return this.resolveRouterSignals(ctx, wfNode.id, result);
    }




    private async onNodeCompleted(
        ctx:               AggexEngine.Execution.Context,
        nodeStatusManager: NodeStatusManager,
        vertexId:          Vertex.Id,
        resolvedOutSignals:Set<Vertex.Id> | void,
    ) {
        const { session, nodeRuntimeMap, workflowCache } = ctx

        ctx.activeNodes.delete(vertexId);

        const entry = nodeRuntimeMap.get(vertexId);
        if (!entry)
            return


        // Set outgoing edges to waiting and increment runCount
        // For router nodes, only update edges for the taken branches
        const allOutgoingEdges = workflowCache.outgoingEdgesMap[entry.wfNode.id];
        let edgeStateUpdate: Execution.Session["edge_state"] = {};

        if (allOutgoingEdges) {
            if ('isRouterNode' in entry.instance && resolvedOutSignals) {
                const takenEdges: Record<string, Workflow.Edge.Id> = {};
                for (const [targetId, edgeId] of Object.entries(allOutgoingEdges)) {
                    if (resolvedOutSignals.has(targetId as unknown as Vertex.Id))
                        takenEdges[targetId] = edgeId;
                }
                edgeStateUpdate = this.applyEdgeStateUpdate(ctx, takenEdges, "waiting", s => { s.runCount += 1; });
            } else {
                edgeStateUpdate = this.applyEdgeStateUpdate(ctx, allOutgoingEdges, "waiting", s => { s.runCount += 1; });
            }
        }

        const existing = ctx.session.node_status[entry.wfNode.id];
        const nodeStatus: Execution.Session.NodeStatus = {
            status:       "completed",
            started_at:   existing?.started_at,
            completed_at: new Date().toISOString(),
        };
        const projectedOutput = session.node_output_projections[entry.wfNode.id];
        const nodeStatusUpdate = nodeStatusManager.handleStatusSet(ctx.session, entry.wfNode.id, nodeStatus);

        ctx.updateSession(d => {
            d.edge_state = { ...d.edge_state, ...edgeStateUpdate };
            Object.assign(d.node_status, nodeStatusUpdate);
        });

        console.log(`[Engine] node:completed ${entry.wfNode.id}`);
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

        await this.awaitPause(ctx);
    }




    private onNodeWaiting(
        ctx:                     AggexEngine.Execution.Context,
        nodeStatusManager:       NodeStatusManager,
        vertexId:                Vertex.Id,
        arrivedSignals:          Set<Vertex.Id>,
        dependencyResolutionMap: Record<Vertex.Id, boolean>,
        _totalDeps:              number,
    ) {
        const entry = ctx.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return

        const { instance, wfNode } = entry;

        const nodeDepMap: Record<Workflow.Node.Id, boolean> = {};
        for (const [depId, resolved] of Object.entries(dependencyResolutionMap)) {
            nodeDepMap[depId as unknown as Workflow.Node.Id] = resolved;
        }

        const existing = ctx.session.node_status[wfNode.id];
        const nodeStatus: Execution.Session.NodeStatus = {
            status: "waiting",
            started_at: existing?.started_at,
        };

        const nodeStatusUpdate = nodeStatusManager.handleStatusSet(ctx.session, wfNode.id, nodeStatus);

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

        const partialInputs = this.resolveInputs(ctx, wfNode.id, arrivedSignals);
        instance.wait(partialInputs, nodeDepMap);
    }




    private onNodeError(
        ctx:               AggexEngine.Execution.Context,
        nodeStatusManager: NodeStatusManager,
        vertexId:          Vertex.Id,
        error:             unknown,
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
        const existing = ctx.session.node_status[nodeId];
        const nodeStatus: Execution.Session.NodeStatus = {
            status: "failed",
            started_at: existing?.started_at,
            completed_at: new Date().toISOString(),
            error: aggexError.toJSON() as any,
        };

        const nodeStatusUpdate = nodeStatusManager.handleStatusSet(ctx.session, nodeId, nodeStatus);

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
        const entry = ctx.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return true;

        const { instance, wfNode } = entry;

        const signalDepField = instance.fields["signalDependency" as Field.Id];
        const dataDepField   = instance.fields["dataDependency" as Field.Id];

        // if(!signalDepField || !dataDepField)
        //     return true;

        // If it is set to strict AND, the S2 engine assessment is sufficient to determine if the node can run
        // Because its expected that the data will be provided on time
        if(signalDepField === "AND")
            return true;
        else{
            if(dataDepField === "AND"){
                // In non-AND signal dependency mode, we need to check if all data dependencies are resolved before allowing the node to run
                const dependencies = ctx.compiledGraph.dependenciesMap.get(vertexId)!;

                const incomingInputs = this.resolveInputs(ctx, wfNode.id, dependencies, true);

                const requiredPortIds = new Set(
                    wfNode.inputs.filter(p => p.required).map(p => p.id)
                );

                // If a required port is undefined, not all data dependencies are resolved yet
                for (const portId in incomingInputs) {
                    if (requiredPortIds.has(portId as Port.Input.Id) && incomingInputs[portId as Port.Input.Id] === undefined)
                        return false;
                }
                return true;
            }
            else {
                return true;
            }
        }
    }





    public async run(

        ctx: AggexEngine.Execution.Context
    
    ): Promise<AggexEngine.Execution.Result> {
        ctx.activeNodes.clear();
        const nodeStatusManager = new NodeStatusManager();

        const hooks: S2Hooks = {
            onVertexExecute:   (...props: Parameters<S2Hooks["onVertexExecute"]>)   => this.onNodeExecuted(ctx, ...props),
            onVertexFired:     (...props: Parameters<S2Hooks["onVertexFired"]>)     => this.onNodeFired(ctx, nodeStatusManager, ...props),
            onVertexCompleted: (...props: Parameters<S2Hooks["onVertexCompleted"]>) => this.onNodeCompleted(ctx, nodeStatusManager, ...props),
            onVertexWaiting:   (...props: Parameters<S2Hooks["onVertexWaiting"]>)   => this.onNodeWaiting(ctx, nodeStatusManager, ...props),
            onVertexError:     (...props: Parameters<S2Hooks["onVertexError"]>)     => this.onNodeError(ctx, nodeStatusManager, ...props),
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
                ctx.abortSignal.addEventListener("abort", () => {
                    resolve({
                        status: "terminated" as const,
                        duration: (performance.now() - start) / 1000
                });
                }, { once: true })
            })
        ])

        return result;
    }
}




export namespace AggexEngine {
    export namespace Execution {
        export type Result = {
            status: "completed" | "terminated";
            duration: number;
        }
    
        export interface Context extends RuntimeNode.ExecutionContext {
            compiledGraph:     S2Graph,
            activeNodes:       Set<Workflow.Node.Id | Vertex.Id>;
            nodeRuntimeMap:  Map<
                Vertex.Id | Workflow.Node.Id, 
                { wfNode: Workflow.Node; instance: RuntimeNode<Blueprint> }
            >
        }

    }

    export type ExecutionContext = Execution.Context;
}
