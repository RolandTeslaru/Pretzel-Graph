import { StateGraph, START, END } from "@langchain/langgraph";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow";
import { CatalogueService } from "src/services/Catalogue/service";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/types";
import { Runtime } from "src/runtime";

export class WorkflowCompiler {
    constructor() {}

    public async compile(
        workflow:   Workflow, 
        emit:       Runtime.Emitter, 
        nodeRunner: Runtime.NodeRunner
    ) {
        const graph = new StateGraph(Runtime.State.Schema);
        const nodes = workflow.data.nodes;
        const edges = workflow.data.edges;

        for (const node of Object.values(nodes)) {

            const VerticeConstructor = await CatalogueService.getNode(node.blueprintId);

            if (!VerticeConstructor)
                throw new Error(`Could not find vertice with blueprintId ${node.blueprintId}`)
            
            const Vertex = new VerticeConstructor(node);

            graph.addNode(node.id, async (state) => {
                return nodeRunner(state, node, Vertex, workflow, emit);
            });
        }

        // 4. Add Edges
        for (const edge of Object.values(edges)) {
            graph.addEdge(
                edge.source.nodeId as any,
                edge.target.nodeId as any
            );
        }

        // 5. Set Entry Points (Start Nodes)
        const startNodes = this.findStartNodes(nodes, edges);
        if (startNodes.length === 0)
            throw new Error("AGGEX Compiler: No start nodes found! Graph might be disconnected.")

        startNodes.forEach(nodeId => {
            graph.addEdge(START, nodeId as "__start__");
        });

        const compiledGraph = graph.compile();

        return compiledGraph;
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
