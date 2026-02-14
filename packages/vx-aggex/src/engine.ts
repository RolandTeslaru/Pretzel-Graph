import { WorkflowCompiler } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow";
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

        const fields = this.resolveNodeFields(activeNode.id, workflow);
        const inputs = this.resolveIncomingValues(state, activeNode.id, workflow);

        const result = await Vertex.run(state, fields, inputs)

        emit(b => b.nodeCompleted(activeNode.id, result))

        return {
            node_outputs: {
                [activeNode.id]: result
            }
        };
    }


    /**
     * Resolve static configuration values for a node.
     * 
     * For each config field defined on the node:
     * 1. Use the override from `staticValues` if present
     * 2. Otherwise fall back to the config schema's `initialValue`
     */
    private resolveNodeFields(
        nodeId:   Workflow.Node.Id,
        workflow: Workflow
    ): Record<Foundations.Field.Id, Foundations.Field.Value> {
        const node         = workflow.data.nodes[nodeId];
        const staticValues = workflow.data.staticValues[nodeId] ?? {};

        const resolved: Record<string, Foundations.Field.Value> = {};

        for (const field of node.fields) {
            const fieldId = field.id as string;
            const brandedId = field.id as Foundations.Field.Id;

            if (brandedId in staticValues)
                resolved[fieldId] = staticValues[brandedId] as Foundations.Field.Value;
            else
                resolved[fieldId] = field.initialValue as Foundations.Field.Value;
        }

        return resolved;
    }


    /**
     * Resolve port input values for a node.
     *
     * Port inputs must be actual class instances (BaseMessage, BaseLanguageModel, etc.).
     *
     * Resolution per input:
     * 1. If an edge connects to this input → extract the value from the source
     *    node's outputs and ensure it's the correct LC class via Synthesizer
     * 2. If no edge → synthesize from the static value (or initialValue fallback)
     *    because the raw primitive must be coerced into a class instance
     */
    private resolveIncomingValues(
        state:    Runtime.State,
        nodeId:   Workflow.Node.Id,
        workflow: Workflow
    ): Record<Foundations.Port.Input.Id, any> {
        const node         = workflow.data.nodes[nodeId];
        const staticValues = workflow.data.staticValues[nodeId] ?? {};

        const resolved: Record<Foundations.Port.Input.Id, any> = {};

        // Build a lookup: targetPortId → edge, for edges incoming to this node
        const incomingEdgeByPort = new Map<Foundations.Port.Input.Id, Workflow.Edge>();

        for (const edge of Object.values(workflow.data.edges))
            if (edge.target.nodeId === nodeId)
                incomingEdgeByPort.set(edge.target.portId, edge);

        for (const input of node.inputs) {
            const edge = incomingEdgeByPort.get(input.id);

            if (edge) {
                // ── Edge-connected: pull value from upstream node's outputs ──
                const sourceOutputs = state.node_outputs[edge.source.nodeId];
                if (sourceOutputs) {
                    const rawReference = sourceOutputs[edge.source.portId as string];
                    resolved[input.id] = Synthesizer.ensureReference(rawReference, input.variant);
                }
            } else {
                // ── No edge: synthesize from static value or initialValue ──
                const staticValue = staticValues[input.id];
                const fallback    = "initialValue" in input ? input.initialValue : undefined;
                const raw         = staticValue ?? fallback;

                if (raw !== undefined) {
                    resolved[input.id] = Synthesizer.synthesizeInput(input, raw as Foundations.Field.Value);
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
