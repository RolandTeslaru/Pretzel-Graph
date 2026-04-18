import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { Foundations, ExecutionSession, Orchestrator } from "@vx-agent-editor/shared/domain";
import { CatalogueService } from "src/services/Catalogue/service";
import { SystemError } from "@vx-agent-editor/shared/domain/SystemError";
import { AggexCompilerError } from "../errors";
import { RuntimeNode } from "../node";
import { Emitter } from "../event/emitter";
import { StreamController } from "../context/stream-controller";
import { S2Graph, Vertex } from "../S2/graph";
import { ExecutionContext, createExecutionContext } from "../context";
import { load } from "@langchain/core/load";
import { BaseMessage } from "@langchain/core/messages";
import { resolveFields } from "../utils";
import { CompilationContext, createCompilationContext } from "./context";

export { CompilationContext, createCompilationContext, extendCompilePath } from "./context";

export interface CompilationResult {
    compiledGraph: S2Graph;
    executionContext: ExecutionContext;
    nodeInstanceMap: Map<Vertex.Id | Workflow.Node.Id, { wfNode: Workflow.Node; instance: RuntimeNode<Foundations.Blueprint> }>;
}

export class WorkflowCompiler {
    constructor() { }

    public async compile(
        workflow: Workflow,
        jobId: Orchestrator.Job.Id,
        session: ExecutionSession,
        emit: Emitter,
        compilationContext: CompilationContext = createCompilationContext(workflow.id),
    ): Promise<CompilationResult> {
        const workflowCache = Workflow.createCache(workflow);

        const graph = new S2Graph();
        const nodes = workflow.data.nodes;
        const edges = workflow.data.edges;

        // START vertex — S2Engine ignites from here
        graph.addVertex(S2Graph.START_VERTEX_ID);

        // Reconstruct BaseMessage instances from plain serialized objects (messages arrive as JSON over HTTP/Redis)
        const reconstructedMessages = await Promise.all(
            session.messages.map(async (msg) => {
                if (msg instanceof BaseMessage) return msg;
                return load(JSON.stringify(msg)) as Promise<BaseMessage>;
            })
        );
        const hydratedSession = { ...session, messages: reconstructedMessages };

        const subWorkflows: ExecutionContext["subWorkflows"] = {};

        const executionCtx = createExecutionContext({
            workflow,
            workflowCache,
            emit,
            jobId,
            session: hydratedSession,
            streamController: new StreamController(),
            abortController: new AbortController(),
            subWorkflows
        });

        const nodeInstanceMap = new Map<Vertex.Id, { wfNode: Workflow.Node; instance: RuntimeNode<Foundations.Blueprint> }>();

        // Add nodes to the graph
        for (const wfNode of Object.values(nodes)) {
            await this.compileNode(wfNode, workflow, graph, nodeInstanceMap, executionCtx, compilationContext);
        }

        // Add Edges. Might also get ran multiple times because nodes can have multiple edges between them because of ports.
        for (const edge of Object.values(edges)) {
            const sourceNode = nodes[edge.source.nodeId];
            const targetNode = nodes[edge.target.nodeId];

            if(sourceNode.isDisabled || targetNode.isDisabled)
                continue;

            graph.addDependency(
                edge.source.nodeId,
                edge.target.nodeId
            );
        }

        // Set Entry Points (Start Nodes)
        const startNodes = this.findStartNodes(nodes, edges);
        if (startNodes.length === 0)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NO_START_NODES,
                "No start nodes found — the graph may be empty"
            )

        startNodes.forEach(nodeId => {
            graph.addDependency(S2Graph.START_VERTEX_ID, nodeId);
        });

        return { 
            compiledGraph: graph, 
            executionContext: executionCtx, 
            nodeInstanceMap 
    };
    }

    private async compileNode(
        wfNode: Workflow.Node,
        workflow: Workflow,
        graph: S2Graph,
        nodeInstanceMap: CompilationResult["nodeInstanceMap"],
        executionCtx: ExecutionContext,
        compilationContext: CompilationContext,
    ): Promise<void> {
        const NodeConstructor = await CatalogueService.getNode(wfNode.blueprintId);

        if (!NodeConstructor)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Could not find node with blueprintId "${wfNode.blueprintId}" in the catalogue`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } }
            )

        const nodeInstance = new NodeConstructor(wfNode, executionCtx);

        await nodeInstance.compile(executionCtx, compilationContext)

        const vertexId = wfNode.id as unknown as Vertex.Id;

        graph.addVertex(wfNode.id);

        nodeInstanceMap.set(vertexId, { wfNode, instance: nodeInstance });

        const fieldValues = resolveFields(wfNode.id, workflow);

        // Set vertex execution strategy based on node fields. Default is "AND"
        if (Object.hasOwn(fieldValues, "signalDependency"))
            graph.setVertexStrategy(
                vertexId,
                fieldValues["signalDependency" as Foundations.Field.Id] as Vertex.STRATEGY
            );
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



