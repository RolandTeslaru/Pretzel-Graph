import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { Workflow } from "@vx-agent-builder/shared/types/Workflow";
import { BaseMessage } from "@langchain/core/messages";

// 1. Define the State Annotation (The Schema)
export const VexrGraphAnnotation = Annotation.Root({
    /**
     * Stores the output of every node execution.
     * Key: Node ID, Value: The result returned by that node.
     */
    node_outputs: Annotation<Record<string, any>>({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({}),
    }),
    /**
     * Shared Chat History (for Agentic workflows).
     */
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
    /**
     * Global artifacts (files, images).
     */
    artifacts: Annotation<Record<string, any>>({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({}),
    }),
    /**
     * Execution Metadata.
     */
    metadata: Annotation<Record<string, any>>({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({}),
    })
});

export class GraphCompiler {
    private workflow: Workflow;

    constructor(workflow: Workflow) {
        this.workflow = workflow;
    }

    /**
     * Compiles the Vexr Workflow JSON into an executable LangGraph StateGraph.
     */
    compile() {
        // 2. Initialize StateGraph with Annotation
        const graph = new StateGraph(VexrGraphAnnotation);

        // 3. Add Nodes
        for (const [nodeId, node] of Object.entries(this.workflow.data.nodes)) {
            graph.addNode(nodeId, async (state) => {
                console.log(`Executing Node: ${node.display_name} (${nodeId})`);

                // A. Resolve Inputs
                const inputs = this.resolveInputs(nodeId, state);

                // B. Placeholder Execution
                const result = { output: "Mock Result" };

                // C. Return Partial State Update
                return {
                    node_outputs: {
                        [nodeId]: result
                    }
                };
            });
        }

        // 4. Add Edges
        for (const [edgeId, edge] of Object.entries(this.workflow.data.edges)) {
            graph.addEdge(edge.source.nodeId, edge.target.nodeId);
        }

        // 5. Set Entry Points (Start Nodes)
        const startNodes = this.findStartNodes();
        if (startNodes.length === 0) {
            console.warn("No start nodes found! Graph might be disconnected.");
        }
        startNodes.forEach(nodeId => {
            graph.addEdge(START, nodeId as "__start__");
        });

        // 6. Compile
        return graph.compile();
    }

    private resolveInputs(nodeId: string, state: typeof VexrGraphAnnotation.State) {
        // Find inputs connected to this node
        const relevantEdges = Object.values(this.workflow.data.edges)
            .filter(edge => edge.target.nodeId === nodeId);

        const inputValues: Record<string, any> = {};

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

    private findStartNodes(): string[] {
        const targetNodes = new Set(Object.values(this.workflow.data.edges).map(e => e.target.nodeId));
        return Object.keys(this.workflow.data.nodes).filter(id => !targetNodes.has(id));
    }
}
