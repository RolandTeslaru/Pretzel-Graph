import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { Foundations, ExecutionSession, Orchestrator } from "@vx-agent-editor/shared/domain";
import { CatalogueService } from "src/services/Catalogue/service";
import { AggexCompilerError } from "../errors";
import { RuntimeNode } from "../node";
import { Emitter } from "../event/emitter";
import { StreamController } from "../context/stream-controller";
import { S2Graph, Vertex } from "../S2/graph";
import { ExecutionContext, createExecutionContext } from "../context";
import { load } from "@langchain/core/load";
import { BaseMessage } from "@langchain/core/messages";
import { InferFields } from "../types";

const START = "__START__" as Vertex.Id;

export interface CompilationResult {
    compiledGraph: S2Graph;
    context: ExecutionContext;
    nodeInstanceMap: Map<Vertex.Id | Workflow.Node.Id, { wfNode: Workflow.Node; instance: RuntimeNode<Foundations.Blueprint> }>;
}

export class WorkflowCompiler {
    constructor() { }

    public async compile(
        workflow: Workflow,
        jobId: Orchestrator.Job.Id,
        session: ExecutionSession,
        emit: Emitter,
    ): Promise<CompilationResult> {
        const workflowCache = Workflow.createCache(workflow);

        const graph = new S2Graph();
        const nodes = workflow.data.nodes;
        const edges = workflow.data.edges;

        // START vertex — S2Engine ignites from here
        graph.addVertex(START);

        // Reconstruct BaseMessage instances from plain serialized objects (messages arrive as JSON over HTTP/Redis)
        const reconstructedMessages = await Promise.all(
            session.messages.map(async (msg) => {
                if (msg instanceof BaseMessage) return msg;
                return load(JSON.stringify(msg)) as Promise<BaseMessage>;
            })
        );
        const hydratedSession = { ...session, messages: reconstructedMessages };

        const context = createExecutionContext({
            workflow,
            workflowCache,
            emit,
            jobId,
            session: hydratedSession,
            streamController: new StreamController(),
            abortController: new AbortController()
        });

        const nodeInstanceMap = new Map<Vertex.Id, { wfNode: Workflow.Node; instance: RuntimeNode<Foundations.Blueprint> }>();

        // Add nodes to the graph
        for (const wfNode of Object.values(nodes)) {

            const NodeConstructor = await CatalogueService.getNode(wfNode.blueprintId);

            if (!NodeConstructor)
                throw new AggexCompilerError(`Could not find node with blueprintId ${wfNode.blueprintId}`)

            const nodeInstance = new NodeConstructor(wfNode, context);

            await nodeInstance.init(context)

            const vertexId = wfNode.id as unknown as Vertex.Id;

            graph.addVertex(wfNode.id);

            nodeInstanceMap.set(vertexId, { wfNode, instance: nodeInstance });

            const fieldValues = resolveFields(wfNode.id, workflow);

            if (Object.hasOwn(fieldValues, "strategy"))
                graph.setVertexStrategy(
                    vertexId,
                    // @ts-expect-error
                    fieldValues.strategy
                );
        }

        // Add Edges. Might also get ran multiple times because nodes can have multiple edges between them because of ports.
        for (const edge of Object.values(edges)) {
            graph.addDependency(
                edge.source.nodeId,
                edge.target.nodeId
            );
        }

        // Set Entry Points (Start Nodes)
        const startNodes = this.findStartNodes(nodes, edges);
        if (startNodes.length === 0)
            throw new AggexCompilerError("No start nodes found! Graph might be disconnected.")

        startNodes.forEach(nodeId => {
            graph.addDependency(START, nodeId);
        });

        return { compiledGraph: graph, context, nodeInstanceMap };
    }

    private findStartNodes(
        nodes: Workflow["data"]["nodes"],
        edges: Workflow["data"]["edges"]
    ): Workflow.Node.Id[] {
        const targetNodeIds: Set<Workflow.Node.Id> = new Set();
        Object.values(edges).forEach(edge => {
            targetNodeIds.add(edge.target.nodeId);
        })

        return Object.keys(nodes).filter(
            id => !targetNodeIds.has(id as Workflow.Node.Id)
        ) as Workflow.Node.Id[];
    }
}




function resolveFields<T_Blueprint extends Foundations.Blueprint>(
    nodeId: Workflow.Node.Id,
    workflow: Workflow
): InferFields<T_Blueprint> {
    const node = workflow.data.nodes[nodeId];
    const staticValues = workflow.data.staticValues[nodeId] ?? {};

    const resolved: Record<Foundations.Field.Id, Foundations.Field.Value> = {};

    for (const field of node.fields) {
        const fieldId = field.id as Foundations.Field.Id;

        if (fieldId in staticValues)
            resolved[fieldId] = staticValues[fieldId] as Foundations.Field.Value;
        else
            resolved[fieldId] = field.initialValue as Foundations.Field.Value;
    }

    return resolved as InferFields<T_Blueprint>
}