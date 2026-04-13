import { CompilationResult } from "../compiler";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { ExecutionSession, Foundations } from "@vx-agent-editor/shared/domain";
import { S2Engine } from "../S2/engine";
import { Vertex } from "../S2/graph";
import { Synthesizer } from "../synthesizer";
import { ExecutionContext } from "../context";
import { SystemError } from "@vx-agent-editor/shared/domain/SystemError";
import { Emitter } from "src/event/emitter";
import { S2Hooks } from "src/S2/types";
import { AggexExecutionError } from "src/errors";

export interface AggexHooks {
    onPause?(): void;
    onResume?(): void;
}

export class AggexEngine {
    private s2Engine: S2Engine | null = null;

    private emit: Emitter;
    private context: ExecutionContext;
    private nodeInstanceMap: CompilationResult['nodeInstanceMap'];
    private compiledGraph: CompilationResult['compiledGraph'];
    private eventChannel: ExecutionSession.Event.Channel;

    private readonly workflow: Workflow;
    private readonly workflowCache: Workflow.Cache;


    private pausePromise: Promise<void> | null = null;
    private pauseResolve: (() => void) | null = null;

    private hooks: AggexHooks;
    private activeNodes: Set<Workflow.Node.Id | Vertex.Id> = new Set();

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

    constructor(compilationResult: CompilationResult, hooks: AggexHooks = {}) {
        this.context = compilationResult.context;
        this.nodeInstanceMap = compilationResult.nodeInstanceMap;
        this.compiledGraph = compilationResult.compiledGraph;
        this.eventChannel = ExecutionSession.Event.getChannel(this.context.session.id)
        this.emit = this.context.emit;
        this.workflow = this.context.workflow;
        this.workflowCache = this.context.workflowCache;
        this.hooks = hooks;
    }


    private projectOutputs(
        result: Record<string, any>,
        wfNode: Workflow.Node
    ): Record<Foundations.Port.Output.Id, Foundations.Projection> {
        const projected: Record<Foundations.Port.Output.Id, Foundations.Projection> = {};

        for (const output of wfNode.outputs) {
            const key = output.id;
            if (key in result)
                projected[key] = Synthesizer.project(result[key], output.variant);
        }

        return projected;
    }


    private resolveRouterSignals(
        nodeId: Workflow.Node.Id,
        result: Record<string, any>
    ): Set<Vertex.Id> {
        const signals = new Set<Vertex.Id>();
        const edges = this.workflow.data.edges;
        const returnedKeys = new Set(Object.keys(result));

        for (const edge of Object.values(edges))
            if (edge.source.nodeId === nodeId && returnedKeys.has(edge.source.portId))
                signals.add(edge.target.nodeId as unknown as Vertex.Id);

        return signals;
    }




    private resolveInputs(
        nodeId: Workflow.Node.Id,
        incomingSignals: Set<Workflow.Node.Id | Vertex.Id> = new Set(),
        keepMissingPorts = false
    ): Record<Foundations.Port.Input.Id, any> {
        const node = this.workflow.data.nodes[nodeId];
        const staticValues = this.workflow.data.staticValues[nodeId] ?? {};

        const resolved: Record<Foundations.Port.Input.Id, any> = {};

        const incomingEdgeByPort = this.workflowCache.inputHandlesMap[nodeId]

        for (const input of node.inputs) {
            const edgeId = incomingEdgeByPort[input.id]
            const edge = this.workflow.data.edges[edgeId];

            if (edge) {
                if(incomingSignals.has(edge.source.nodeId) === false){
                    if(keepMissingPorts)
                        resolved[input.id] = undefined;
                    continue;
                }

                const sourceOutputs = this.context.session.node_output_instances[edge.source.nodeId];
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
                    resolved[input.id] = raw as Foundations.Field.Value;
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
        edgeIds: Record<string, Workflow.Edge.Id>,
        status: ExecutionSession.EdgeState["status"],
        onUpdate?: (state: ExecutionSession.EdgeState) => void,
    ): ExecutionSession["edge_state"] {
        this.context.updateSession(d => {
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
            update[edgeId] = this.context.session.edge_state[edgeId];

        return update;
    }
    


    private onNodeFired(nodeId: Vertex.Id) {
        const entry = this.nodeInstanceMap.get(nodeId);
        if (!entry)
            return;

        const edgeStateUpdate: ExecutionSession["edge_state"] = {};

        // Set all incoming (dependency) edges to completed
        const incomingEdges = this.workflowCache.incomingEdgesMap[entry.wfNode.id];
        if (incomingEdges)
            Object.assign(edgeStateUpdate, this.applyEdgeStateUpdate(incomingEdges, "completed"));

        // Set all outgoing edges to preparing (skip for router nodes — only the taken branch should light up)
        if (!('isRouterNode' in entry.instance)) {
            const outgoingEdges = this.workflowCache.outgoingEdgesMap[entry.wfNode.id];
            if (outgoingEdges)
                Object.assign(edgeStateUpdate, this.applyEdgeStateUpdate(outgoingEdges, "preparing"));
        }

        this.activeNodes.add(nodeId)

        this.emit<ExecutionSession.Event.Node.Started>({
            workflowId: this.workflow.id,
            type: "node:started",
            executionSessionId: this.context.session.id,
            nodeId: entry.wfNode.id,
            channel: this.eventChannel,
            stateUpdate: { edge_state: edgeStateUpdate },
        });
    }


    private async awaitPause() {
        if(!this.pausePromise)
            return

        if(this.activeNodes.size === 0)
            this.hooks.onPause?.();

        await this.pausePromise;
    }
        


    private onNodeExecuted = async (
        vertexId: Vertex.Id, 
        signals: Set<Workflow.Node.Id | Vertex.Id>
    ): Promise<Set<Vertex.Id> | void> => {
        
        const entry = this.nodeInstanceMap.get(vertexId);
        if (!entry)
            return;
        
        const wfNode = entry.wfNode;
        const nodeInstance = entry.instance;

        const allDependencies = this.compiledGraph.dependenciesMap.get(vertexId)!; 

        const dataDependency = entry.instance.fields["dataDependency" as Foundations.Field.Id];
        
        const inputs = this.resolveInputs(wfNode.id, dataDependency === "AND" ? allDependencies : signals);

        const isTool = nodeInstance.fields["isConvertedToTool" as Foundations.Field.Id] === true;

        let result;
        if(isTool)
            result = await nodeInstance.buildTool(inputs);
        else
            result = await nodeInstance.run(inputs);

        this.context.updateSession(d => {
            d.node_output_instances[wfNode.id] = result;
            d.node_output_projections[wfNode.id] = this.projectOutputs(result, wfNode);
        });
            
        if ('isRouterNode' in nodeInstance)
            return this.resolveRouterSignals(wfNode.id, result);
    }



    private async onNodeCompleted(vertexId: Vertex.Id, resolvedOutSignals: Set<Vertex.Id> | void) {
        this.activeNodes.delete(vertexId);

        const entry = this.nodeInstanceMap.get(vertexId);
        if (!entry)
            return

        const projectedOutput = this.context.session.node_output_projections[entry.wfNode.id];

        // Set outgoing edges to waiting and increment runCount
        // For router nodes, only update edges for the taken branches
        const allOutgoingEdges = this.workflowCache.outgoingEdgesMap[entry.wfNode.id];
        let edgeStateUpdate: ExecutionSession["edge_state"] = {};

        if (allOutgoingEdges) {
            if ('isRouterNode' in entry.instance && resolvedOutSignals) {
                const takenEdges: Record<string, Workflow.Edge.Id> = {};
                for (const [targetId, edgeId] of Object.entries(allOutgoingEdges)) {
                    if (resolvedOutSignals.has(targetId as unknown as Vertex.Id))
                        takenEdges[targetId] = edgeId;
                }
                edgeStateUpdate = this.applyEdgeStateUpdate(takenEdges, "waiting", s => { s.runCount += 1; });
            } else {
                edgeStateUpdate = this.applyEdgeStateUpdate(allOutgoingEdges, "waiting", s => { s.runCount += 1; });
            }
        }

        this.emit<ExecutionSession.Event.Node.Completed>({
            executionSessionId: this.context.session.id,
            workflowId: this.workflow.id,
            type: "node:completed",
            nodeId: entry.wfNode.id,
            channel: this.eventChannel,
            output: projectedOutput,
            stateUpdate: { edge_state: edgeStateUpdate },
        });

        await this.awaitPause();
    }




    private onNodeWaiting(
        vertexId: Vertex.Id,
        arrivedSignals: Set<Vertex.Id>,
        dependencyResolutionMap: Record<Vertex.Id, boolean>,
        totalDeps: number
    ) {
        const entry = this.nodeInstanceMap.get(vertexId);
        if (!entry)
            return

        const { instance, wfNode } = entry;

        const nodeDepMap: Record<Workflow.Node.Id, boolean> = {};
        for (const [depId, resolved] of Object.entries(dependencyResolutionMap)) {
            nodeDepMap[depId as unknown as Workflow.Node.Id] = resolved;
        }

        this.emit<ExecutionSession.Event.Node.Waiting>({
            executionSessionId: this.context.session.id,
            workflowId: this.workflow.id,
            type: "node:waiting",
            nodeId: wfNode.id,
            channel: this.eventChannel,
            dependencyResolutionMap: nodeDepMap,
            totalDeps
        });

        const partialInputs = this.resolveInputs(wfNode.id, arrivedSignals);
        instance.wait(partialInputs, nodeDepMap);
    }




    private onNodeError(vertexId: Vertex.Id, error: unknown) {
        console.error(`Error during node execution, ${vertexId}:`, error)

        // If the node already threw a SystemError (or subclass), preserve it.
        // Otherwise wrap the S2/unknown error into an AggexExecutionError.
        const aggexError = error instanceof SystemError
            ? error
            : new AggexExecutionError(
                SystemError.Code.EXECUTION_NODE_FAILED,
                error instanceof Error ? error.message : String(error),
            )

        this.emit<ExecutionSession.Event.Node.Error>({
            executionSessionId: this.context.session.id,
            workflowId: this.workflow.id,
            type: "node:error",
            nodeId: vertexId as unknown as Workflow.Node.Id,
            channel: this.eventChannel,
            error: aggexError.toJSON()
        })
    }


    private canNodeRun(
        vertexId: Vertex.Id,
        receivedSignals: Set<Vertex.Id>,
    ): boolean {
        const entry = this.nodeInstanceMap.get(vertexId);
        if (!entry)
            return true;

        const { instance, wfNode } = entry;

        const signalDepField = instance.fields["signalDependency" as Foundations.Field.Id];
        const dataDepField = instance.fields["dataDependency" as Foundations.Field.Id];

        // if(!signalDepField || !dataDepField)
        //     return true;

        // If it is set to strict AND, the S2 engine assessment is sufficient to determine if the node can run
        // Because its expected that the data will be provided on time
        if(signalDepField === "AND")
            return true;
        else{
            if(dataDepField === "AND"){
                // In non-AND signal dependency mode, we need to check if all data dependencies are resolved before allowing the node to run
                const dependencies = this.compiledGraph.dependenciesMap.get(vertexId)!;

                const incomingInputs = this.resolveInputs(wfNode.id, dependencies, true);

                // If we find a undefined port, it means that not all data dependencies are resolved, and the node cannot run yet
                for(const portId in incomingInputs){
                    if(incomingInputs[portId as Foundations.Port.Input.Id] === undefined)
                        return false;
                }
                return true;
            }
            else {
                return true;
            }
        }
    }



    public async run() {
        this.s2Engine = new S2Engine();

        this.activeNodes.clear();

        const hooks: S2Hooks = {
            onVertexExecute: this.onNodeExecuted.bind(this),
            onVertexFired: this.onNodeFired.bind(this),
            onVertexCompleted: this.onNodeCompleted.bind(this),
            onVertexWaiting: this.onNodeWaiting.bind(this),
            onVertexError: this.onNodeError.bind(this),
            canVertexRun: this.canNodeRun.bind(this)
        } as const

        const start = performance.now();

        const result =  await Promise.race<AggexEngine.ExecutionResult>([

            this.s2Engine.ignite(this.compiledGraph, hooks).then(
                () => ({ 
                    status: "completed" as const, 
                    duration: (performance.now() - start) / 1000 
                })
            ),

            new Promise((resolve, reject) => {
                this.context.abortController.signal.addEventListener("abort", () => {
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
}