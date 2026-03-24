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

export class AggexEngine {
    private s2Engine: S2Engine | null = null;

    private context: ExecutionContext;
    private nodeInstanceMap: CompilationResult['nodeInstanceMap'];
    private compiledGraph: CompilationResult['compiledGraph'];
    private eventChannel: ExecutionSession.Event.Channel;
    private readonly workflow: Workflow;
    private readonly workflowCache: Workflow.Cache;

    private emit: Emitter;

    constructor(compilationResult: CompilationResult) {
        this.context = compilationResult.context;
        this.nodeInstanceMap = compilationResult.nodeInstanceMap;
        this.compiledGraph = compilationResult.compiledGraph;
        this.eventChannel = ExecutionSession.Event.getChannel(this.context.session.id)
        this.emit = this.context.emit;
        this.workflow = this.context.workflow;
        this.workflowCache = this.context.workflowCache;
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
    ): Record<Foundations.Port.Input.Id, any> {
        const node = this.workflow.data.nodes[nodeId];
        const staticValues = this.workflow.data.staticValues[nodeId] ?? {};

        const resolved: Record<Foundations.Port.Input.Id, any> = {};

        const incomingEdgeByPort = this.workflowCache.inputHandlesMap[nodeId]

        for (const input of node.inputs) {
            const edgeId = incomingEdgeByPort[input.id]
            const edge = this.workflow.data.edges[edgeId];

            if (edge) {
                const sourceOutputs = this.context.session.node_outputs[edge.source.nodeId];
                if (sourceOutputs) {
                    const rawReference = sourceOutputs[edge.source.portId as string];
                    resolved[input.id] = Synthesizer.ensureReference(rawReference, input.variant);
                }
            } else {
                const staticValue = staticValues[input.id];
                const fallback = "initialValue" in input ? input.initialValue : undefined;
                const raw = staticValue ?? fallback;

                if (raw !== undefined) {
                    resolved[input.id] = raw as Foundations.Field.Value;
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

        // Set all outgoing edges to preparing
        const outgoingEdges = this.workflowCache.outgoingEdgesMap[entry.wfNode.id];
        if (outgoingEdges)
            Object.assign(edgeStateUpdate, this.applyEdgeStateUpdate(outgoingEdges, "preparing"));

        this.emit<ExecutionSession.Event.Node.Started>({
            workflowId: this.workflow.id,
            type: "node:started",
            executionSessionId: this.context.session.id,
            nodeId: entry.wfNode.id,
            channel: this.eventChannel,
            stateUpdate: { edge_state: edgeStateUpdate },
        });
    }





    private onNodeExecuted = async (vertexId: Vertex.Id): Promise<Set<Vertex.Id> | void> => {
        const entry = this.nodeInstanceMap.get(vertexId);
        if (!entry)
            return;

        const wfNode = entry.wfNode;
        const nodeInstance = entry.instance;

        const inputs = this.resolveInputs(wfNode.id);

        const result = await nodeInstance.run(inputs);
        this.context.updateSession(d => {
            d.node_outputs[wfNode.id] = result;
        });

        if ('isRouterNode' in nodeInstance)
            return this.resolveRouterSignals(wfNode.id, result);

    }



    private onNodeCompleted(vertexId: Vertex.Id) {
        const entry = this.nodeInstanceMap.get(vertexId);
        if (!entry)
            return

        const output = this.context.session.node_outputs[entry.wfNode.id];

        // Set all outgoing edges to waiting and increment runCount
        const outgoingEdges = this.workflowCache.outgoingEdgesMap[entry.wfNode.id];
        const edgeStateUpdate: ExecutionSession["edge_state"] = outgoingEdges
            ? this.applyEdgeStateUpdate(outgoingEdges, "waiting", s => { s.runCount += 1; })
            : {};

        this.emit<ExecutionSession.Event.Node.Completed>({
            executionSessionId: this.context.session.id,
            workflowId: this.workflow.id,
            type: "node:completed",
            nodeId: entry.wfNode.id,
            channel: this.eventChannel,
            output,
            stateUpdate: { edge_state: edgeStateUpdate },
        });
    }




    private onNodeWaiting(
        vertexId: Vertex.Id,
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

        const partialInputs = this.resolveInputs(wfNode.id);
        instance.wait(partialInputs, nodeDepMap);
    }




    private onVertexError(vertexId: Vertex.Id, error: unknown) {
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



    public async run() {
        this.s2Engine = new S2Engine();

        const hooks: S2Hooks = {
            onVertexExecute: this.onNodeExecuted.bind(this),
            onVertexFired: this.onNodeFired.bind(this),
            onVertexCompleted: this.onNodeCompleted.bind(this),
            onVertexWaiting: this.onNodeWaiting.bind(this),
            onVertexError: this.onVertexError.bind(this),
        } as const

        await this.s2Engine.ignite(this.compiledGraph, hooks);
    }
}