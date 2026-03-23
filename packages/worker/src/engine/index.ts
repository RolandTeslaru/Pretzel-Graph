import { CompilationResult } from "../compiler";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { ExecutionSession, Foundations, Orchestrator } from "@vx-agent-editor/shared/domain";
import { z } from "zod";
import { RuntimeNode, RuntimeRouterNode } from "../node"
import { S2Engine, S2Hooks } from "../S2/engine";
import { Vertex } from "../S2/graph";
import { Synthesizer } from "../synthesizer";
import { ExecutionContext } from "../context";
import { SysError } from "@vx-agent-editor/shared/domain/SysError";
import { Emitter } from "src/event/emitter";

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




    private onNodeFired(nodeId: Vertex.Id) {
        const entry = this.nodeInstanceMap.get(nodeId);
        if (!entry) 
            return;

        // Set all incoming (dependency) edges to completed
        const incomingEdges = this.workflowCache.incomingEdgesMap[entry.wfNode.id];
        if (incomingEdges) {
            this.context.updateSession(d => {
                if (!d.edge_state)
                    d.edge_state = {};

                for (const edgeId of Object.values(incomingEdges))
                    if (d.edge_state[edgeId])
                        d.edge_state[edgeId].status = "completed";
            });

            const edgeStateUpdate: ExecutionSession["edge_state"] = {};

            for (const edgeId of Object.values(incomingEdges))
                if (this.context.session.edge_state[edgeId])
                    edgeStateUpdate[edgeId] = this.context.session.edge_state[edgeId];

            this.emit<ExecutionSession.Event.Update>({
                executionSessionId: this.context.session.id,
                workflowId: this.workflow.id,
                type: "update",
                channel: this.eventChannel,
                update: { edge_state: edgeStateUpdate },
            });
        }

        // Set all outgoing edges to preparing
        const outgoingEdgesFired = this.workflowCache.outgoingEdgesMap[entry.wfNode.id];
        if (outgoingEdgesFired) {
            this.context.updateSession(d => {
                if (!d.edge_state) d.edge_state = {};

                for (const edgeId of Object.values(outgoingEdgesFired))
                    if (!d.edge_state[edgeId])
                        d.edge_state[edgeId] = { status: "preparing", runCount: 0 };
                    else
                        d.edge_state[edgeId].status = "preparing";
            });

            const preparingUpdate: ExecutionSession["edge_state"] = {};
            for (const edgeId of Object.values(outgoingEdgesFired))
                preparingUpdate[edgeId] = this.context.session.edge_state[edgeId];

            this.emit<ExecutionSession.Event.Update>({
                executionSessionId: this.context.session.id,
                workflowId: this.workflow.id,
                type: "update",
                channel: this.eventChannel,
                update: { edge_state: preparingUpdate },
            });
        }

        this.emit<ExecutionSession.Event.Node.Started>({
            workflowId: this.workflow.id,
            type: "node:started",
            executionSessionId: this.context.session.id,
            nodeId: entry.wfNode.id,
            channel: this.eventChannel,
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
        if (outgoingEdges) {
            this.context.updateSession(d => {
                if (!d.edge_state)
                    d.edge_state = {};

                for (const edgeId of Object.values(outgoingEdges)) {
                    if (!d.edge_state[edgeId])
                        d.edge_state[edgeId] = { status: "waiting", runCount: 0 };

                    d.edge_state[edgeId].status = "waiting";
                    d.edge_state[edgeId].runCount += 1;
                }
            });

            const edgeStateUpdate: ExecutionSession["edge_state"] = {};
            for (const edgeId of Object.values(outgoingEdges))
                edgeStateUpdate[edgeId] = this.context.session.edge_state[edgeId];

            this.emit<ExecutionSession.Event.Update>({
                executionSessionId: this.context.session.id,
                workflowId: this.workflow.id,
                type: "update",
                channel: this.eventChannel,
                update: { edge_state: edgeStateUpdate },
            });
        }

        this.emit<ExecutionSession.Event.Node.Completed>({
            executionSessionId: this.context.session.id,
            workflowId: this.workflow.id,
            type: "node:completed",
            nodeId: entry.wfNode.id,
            channel: this.eventChannel,
            output,
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

        const sysError = SysError.fromUnknown(error, SysError.Code.EXECUTION_NODE_FAILED)

        this.emit<ExecutionSession.Event.Node.Error>({
            executionSessionId: this.context.session.id,
            workflowId: this.workflow.id,
            type: "node:error",
            nodeId: vertexId as unknown as Workflow.Node.Id,
            channel: this.eventChannel,
            error: sysError.toJSON()
        })
    }


    
    public async run() {
        this.s2Engine = new S2Engine();

        const hooks: S2Hooks = {
            onVertexExecute:   this.onNodeExecuted.bind(this),
            onVertexFired:     this.onNodeFired.bind(this),
            onVertexCompleted: this.onNodeCompleted.bind(this),
            onVertexWaiting:   this.onNodeWaiting.bind(this),
            onVertexError:     this.onVertexError.bind(this),
        } as const

        await this.s2Engine.ignite(this.compiledGraph, hooks);
    }
}