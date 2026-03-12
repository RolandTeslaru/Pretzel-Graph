import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { Foundations, ExecutionSession, Orchestrator } from "@vx-agent-editor/shared/domain";
import { CatalogueService } from "src/services/Catalogue/service";
import { PretzelCompilerError } from "./errors";
import { RuntimeNode } from "./node";
import { Emitter } from "./event/emitter";
import { StreamController } from "./StreamController";
import { S2Graph, Vertex } from "./S2/graph";
import { ExecutionContext, createExecutionContext } from "./context";

const START = "__START__" as Vertex.Id;

export interface CompilationResult {
    compiledGraph: S2Graph;
    context: ExecutionContext;
    nodeInstanceMap: Map<Vertex.Id, { wfNode: Workflow.Node; instance: RuntimeNode<Foundations.Blueprint> }>;
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

        const context = createExecutionContext({
            workflow,
            workflowCache,
            emit,
            jobId,
            session,
            streamController: new StreamController()
        });

        const nodeInstanceMap = new Map<Vertex.Id, { wfNode: Workflow.Node; instance: RuntimeNode<Foundations.Blueprint> }>();

        // Add nodes to the graph
        for (const wfNode of Object.values(nodes)) {

            const NodeConstructor = await CatalogueService.getNode(wfNode.blueprintId);

            if (!NodeConstructor)
                throw new PretzelCompilerError(`Could not find node with blueprintId ${wfNode.blueprintId}`)

            const nodeInstance = new NodeConstructor(wfNode, context);

            await nodeInstance.init(context)

            const vertexId = wfNode.id as unknown as Vertex.Id;

            graph.addVertex(wfNode.id);

            nodeInstanceMap.set(vertexId, { wfNode, instance: nodeInstance });

            if(Object.hasOwn(wfNode.fields, "strategy"))
                graph.setVertexStrategy(
                    vertexId,
                    // @ts-expect-error
                    wfNode.fields.strategy
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
            throw new PretzelCompilerError("No start nodes found! Graph might be disconnected.")

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
