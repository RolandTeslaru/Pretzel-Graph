import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { ExecutionSession } from "@vx-agent-editor/shared/domain";
import { S2Engine } from "../S2/engine";
import { S2Graph, Vertex } from "../S2/graph";
import { Synthesizer } from "../synthesizer";
import { SystemError } from "@vx-agent-editor/shared/domain/SystemError";
import { S2Hooks } from "src/S2/types";
import { AggexExecutionError } from "src/errors";
import { RuntimeNode } from "@vx-agent-editor/node-sdk";
import { Blueprint } from "@vx-agent-editor/shared/domain/Foundations/Blueprint";
import { WorkflowCompiler } from "src/compiler";
import { Port } from "@vx-agent-editor/shared/domain/Foundations/Port";
import { Projection } from "@vx-agent-editor/shared/domain/Foundations/Projection";
import { Field } from "@vx-agent-editor/shared/domain/Foundations/Field";

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

    private getEventChannel(ctx: AggexEngine.ExecutionContext): ExecutionSession.Event.Channel{
        return ExecutionSession.Event.getChannel(ctx.session.id);
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
        ctx: AggexEngine.ExecutionContext,
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
        ctx: AggexEngine.ExecutionContext,
        nodeId: Workflow.Node.Id,
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
        ctx: AggexEngine.ExecutionContext,
        edgeIds: Record<string, Workflow.Edge.Id>,
        status: ExecutionSession.EdgeState["status"],
        onUpdate?: (state: ExecutionSession.EdgeState) => void,
    ): ExecutionSession["edge_state"] {
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

        const update: ExecutionSession["edge_state"] = {};
        for (const edgeId of Object.values(edgeIds))
            update[edgeId] = ctx.session.edge_state[edgeId];

        return update;
    }
    


    private onNodeFired(
        ctx: AggexEngine.ExecutionContext, 
        nodeId: Vertex.Id
    ): void {
        const { workflowId, session, workflowCache, nodeInstanceMap } = ctx

        const entry = nodeInstanceMap.get(nodeId);
        if (!entry)
            return;

        const edgeStateUpdate: ExecutionSession["edge_state"] = {};

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

        ctx.emit<ExecutionSession.Event.Node.Started>({
            workflowId: workflowId,
            type: "node:started",
            executionSessionId: session.id,
            nodeId: entry.wfNode.id,
            channel: this.getEventChannel(ctx),
            stateUpdate: { edge_state: edgeStateUpdate },
        });
    }


    private async awaitPause(ctx: AggexEngine.ExecutionContext) {
        if(!this.pausePromise)
            return

        if(ctx.activeNodes.size === 0)
            this.hooks.onPause?.();

        await this.pausePromise;
    }
        


    private onNodeExecuted = async (
        ctx: AggexEngine.ExecutionContext,
        vertexId: Vertex.Id, 
        signals: Set<Workflow.Node.Id | Vertex.Id>
    ): Promise<Set<Vertex.Id> | void> => {
        
        const entry = ctx.nodeInstanceMap.get(vertexId);
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
            
        if ('isRouterNode' in nodeInstance)
            return this.resolveRouterSignals(ctx, wfNode.id, result);
    }



    private async onNodeCompleted(
        ctx: AggexEngine.ExecutionContext,
        vertexId: Vertex.Id,
        resolvedOutSignals: Set<Vertex.Id> | void
    ) {
        const { session, nodeInstanceMap, workflowCache } = ctx

        ctx.activeNodes.delete(vertexId);

        const entry = nodeInstanceMap.get(vertexId);
        if (!entry)
            return

        const projectedOutput = session.node_output_projections[entry.wfNode.id];

        // Set outgoing edges to waiting and increment runCount
        // For router nodes, only update edges for the taken branches
        const allOutgoingEdges = workflowCache.outgoingEdgesMap[entry.wfNode.id];
        let edgeStateUpdate: ExecutionSession["edge_state"] = {};

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

        ctx.emit<ExecutionSession.Event.Node.Completed>({
            executionSessionId: ctx.session.id,
            workflowId: ctx.workflowId,
            type: "node:completed",
            nodeId: entry.wfNode.id,
            channel: this.getEventChannel(ctx),
            output: projectedOutput,
            stateUpdate: { edge_state: edgeStateUpdate },
        });

        await this.awaitPause(ctx);
    }




    private onNodeWaiting(
        ctx: AggexEngine.ExecutionContext,
        vertexId: Vertex.Id,
        arrivedSignals: Set<Vertex.Id>,
        dependencyResolutionMap: Record<Vertex.Id, boolean>,
        totalDeps: number
    ) {
        const entry = ctx.nodeInstanceMap.get(vertexId);
        if (!entry)
            return

        const { instance, wfNode } = entry;

        const nodeDepMap: Record<Workflow.Node.Id, boolean> = {};
        for (const [depId, resolved] of Object.entries(dependencyResolutionMap)) {
            nodeDepMap[depId as unknown as Workflow.Node.Id] = resolved;
        }

        ctx.emit<ExecutionSession.Event.Node.Waiting>({
            executionSessionId: ctx.session.id,
            workflowId: ctx.workflowId,
            type: "node:waiting",
            nodeId: wfNode.id,
            channel: this.getEventChannel(ctx),
            dependencyResolutionMap: nodeDepMap,
            totalDeps
        });

        const partialInputs = this.resolveInputs(ctx, wfNode.id, arrivedSignals);
        instance.wait(partialInputs, nodeDepMap);
    }




    private onNodeError(
        ctx: AggexEngine.ExecutionContext, 
        vertexId: Vertex.Id, 
        error: unknown
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

        ctx.emit<ExecutionSession.Event.Node.Error>({
            executionSessionId: ctx.session.id,
            workflowId: ctx.workflowId,
            type: "node:error",
            nodeId: vertexId as unknown as Workflow.Node.Id,
            channel: this.getEventChannel(ctx),
            error: aggexError.toJSON()
        })
    }


    private canNodeRun(
        ctx: AggexEngine.ExecutionContext,
        vertexId: Vertex.Id,
        receivedSignals: Set<Vertex.Id>,
        s2EngineAssesment: boolean
    ): boolean {
        const entry = ctx.nodeInstanceMap.get(vertexId);
        if (!entry)
            return true;

        const { instance, wfNode } = entry;

        const signalDepField = instance.fields["signalDependency" as Field.Id];
        const dataDepField = instance.fields["dataDependency" as Field.Id];

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

                // If we find a undefined port, it means that not all data dependencies are resolved, and the node cannot run yet
                for(const portId in incomingInputs){
                    if(incomingInputs[portId as Port.Input.Id] === undefined)
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

        ctx: AggexEngine.ExecutionContext
    
    ): Promise<AggexEngine.ExecutionResult> {
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

        const result =  await Promise.race<AggexEngine.ExecutionResult>([

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
    export type ExecutionResult = {
        status: "completed" | "terminated";
        duration: number;
    }

    export interface ExecutionContext extends RuntimeNode.ExecutionContext {
        compiledGraph: S2Graph,
        compileWorkflow: WorkflowCompiler["compile"]
        runSubWorkflow: AggexEngine["run"]
        activeNodes: Set<Workflow.Node.Id | Vertex.Id>;
        nodeInstanceMap:  Map<
        
            Vertex.Id | Workflow.Node.Id, 
            { wfNode: Workflow.Node; instance: RuntimeNode<Blueprint> }
        
        >
    }
}