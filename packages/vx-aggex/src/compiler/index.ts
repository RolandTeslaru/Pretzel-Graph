import { StateGraph, START, END } from "@langchain/langgraph";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow";
import { CatalogueService } from "src/services/Catalogue/service";
import { Foundations } from "@vx-agent-editor/shared/types";
import { Runtime } from "src/runtime";


export class AggexCompiler {
    private verticies: Record<
        Workflow.Node.Id,
        Runtime.Node<Foundations.NodeDefinition>
    > = {};

    constructor() {}


    private async runNode(
        state: Runtime.State, 
        activeNode: Workflow.Node, 
        edges: Workflow["data"]["edges"]
    ) {
        console.log(`Executing Node: ${activeNode.display_name} (${activeNode.id})`);

        const inputs = this.resolveInputs(state, activeNode.id, edges);

        const Vertice = this.verticies[activeNode.id];

        const result = await Vertice.run(state, inputs)

        return {
            node_outputs: {
                [activeNode.id]: result
            }
        };
    }


    public async compile(workflow: Workflow) {
        const graph = new StateGraph(Runtime.State.Schema);
        const nodes = workflow.data.nodes;
        const edges = workflow.data.edges;

        for (const node of Object.values(nodes)) {

            const VerticeConstructor = await CatalogueService.getNode(node.definitionId);

            if (!VerticeConstructor)
                throw new Error(`Could not find vertice with definitionId ${node.definitionId}`)

            this.verticies[node.id] = new VerticeConstructor(node);

            graph.addNode(node.id, async (state) => {
                return this.runNode(state, node, edges)
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
            throw new Error("No start nodes found! Graph might be disconnected.")

        startNodes.forEach(nodeId => {
            graph.addEdge(START, nodeId as "__start__");
        });

        const compiledGraph = graph.compile();

        return compiledGraph;
    }

    private resolveInputs(
        state: Runtime.State,
        nodeId: Workflow.Node.Id, 
        edges: Workflow["data"]["edges"]
    ) {
        // Find inputs connected to this node
        const relevantEdges = Object.values(edges)
            .filter(edge => edge.target.nodeId === nodeId);

        const inputValues: Record<Foundations.Input.Id, any> = {};

        for (const edge of relevantEdges) {
            const sourceNodeId = edge.source.nodeId;
            // Get data from the "Shared Memory" (node_outputs)
            const sourceOutput = state.node_outputs[sourceNodeId];

            // Map it to the target input handle (e.g. "prompt" or "context")
            const targetHandle = edge.target.handleId;
            inputValues[targetHandle] = sourceOutput;
        }

        // Also merge static parameter values (user config)
        // const staticValues = this.workflow.data.nodes[nodeId].data.inputs...

        return inputValues;
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
