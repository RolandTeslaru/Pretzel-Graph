import { WorkflowCompiler } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow"; // Placeholder
import { Runtime } from "./runtime";
import { cloneDeep } from "lodash";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/types";
import { Synthesizer } from "./synthesizer";

export class AggexEngine {
    private compiler = new WorkflowCompiler();
    constructor() { }


    private async runNode(
        state:      Runtime.State,
        activeNode: Workflow.Node,
        Vertex:     Runtime.Node<Foundations.Blueprint>,
        workflow:   Workflow,
        emit:       Runtime.Emitter
    ) {
        console.log(`Executing Node: ${activeNode.displayName} (${activeNode.id})`);

        emit(b => b.nodeStarted(activeNode.id))

        const incomingValues = this.resolveIncomingValues(state, activeNode.id, workflow);

        const result = await Vertex.run(state, incomingValues)

        emit(b => b.nodeCompleted(activeNode.id, result))

        return {
            node_outputs: {
                [activeNode.id]: result
            }
        };
    }

    /**
     * Build the inputs bag for a node.
     * 
     * Resolution per input:
     * 1. If an edge connects to this input → use the source node's output value
     * 2. Otherwise → use the field value from workflow.data.fieldValues
     */
    private resolveIncomingValues(
        state:    Runtime.State,
        nodeId:   Workflow.Node.Id,
        workflow: Workflow
    ): Record<Foundations.Port.Input.Id, any> {
        const edges = workflow.data.edges;
        const fieldValues = workflow.data.staticValues[nodeId] ?? {};
        const node = workflow.data.nodes[nodeId];

        const resolved: Record<Foundations.Port.Input.Id, any> = {};

        // Collect edge-connected values (port inputs from upstream outputs)
        const incomingEdges = Object.values(edges)
            .filter(edge => edge.target.nodeId === nodeId);

        const edgeConnectedInputs = new Set<string>();

        for (const edge of incomingEdges) {
            const source = edge.source;
            const target = edge.target; // target node id is this node;

            // Get the specific output value from the source node's outputs
            const stateSourceOutput = state.node_outputs[source.nodeId];
            const outputSchema = workflow.data.nodes[source.nodeId].outputs.find(output => output.id === source.handleId);
            if(!outputSchema)
                continue;

            if(outputSchema.variant in Foundations.Input.Ports.Variant){
                resolved[target.handleId] = Synthesizer.ensureClassComponent(stateSourceOutput, outputSchema.variant)
            }

            if (stateSourceOutput && outputSchema) {
                resolved[target.handleId] = Synthesizer.ensureClassComponent(stateSourceOutput, outputSchema.variant)
                if(outputSchema.variant === "message")


                resolved[target.handleId] = sourceOutputs[source.handleId];
                edgeConnectedInputs.add(target.handleId);
            }
        }

        // Fill remaining inputs from field values (user-configured primitives)
        for (const input of node.inputs) {
            if (!edgeConnectedInputs.has(input.id)) {
                if (input.id in fieldValues) {
                    resolved[input.id] = fieldValues[input.id];
                } else if ("initialValue" in input) {
                    resolved[input.id] = input.initialValue;
                }
            }
        }

        return resolved;
    }

    public compile(workflow: Workflow, emit: Runtime.Emitter) {
        return this.compiler.compile(workflow, emit, this.runNode.bind(this))
    }

    public async *stream(
        compiledGraph: Runtime.CompiledGraph,
        initialInputs: Record<string, any>
    ): AsyncIterable<Runtime.State.Update> {
        const state = cloneDeep(Orchestrator.RuntimeState.INITIAL)

        for await (const update of await compiledGraph.stream(state)) {
            yield update
        }
    }


    public async run(initialInputs: Record<string, any>) {
        const state = cloneDeep(Orchestrator.RuntimeState.INITIAL)
        // return await this.compiledGraph.invoke(state);
    }
}
