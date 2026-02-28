import { WorkflowCompiler } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { Runtime } from "./runtime";
import { cloneDeep } from "lodash";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/domain";
import { Synthesizer } from "./synthesizer";


export type StreamEvent =
    | { mode: "values"; state: Runtime.State }
    | { mode: "messages"; nodeId: Workflow.Node.Id; content: string }
    | { mode: "conversation"; nodeId: Workflow.Node.Id; content: string }
    | { mode: "updates"; update: Runtime.State.Update }

export class AggexEngine {
    private compiler = new WorkflowCompiler();
    constructor() { }


    private async runNode(
        state: Runtime.State,
        activeNode: Workflow.Node,
        Vertex: Runtime.Node<Foundations.Blueprint>,
        workflow: Workflow,
        workflowCache: Workflow.Cache,
        emit: Runtime.Emitter
    ) {
        console.log(`Executing Node: ${activeNode.displayName} (${activeNode.id})`);

        emit(b => b.nodeStarted(activeNode.id))

        const inputs = this.resolveInputs(state, activeNode.id, workflow, workflowCache);

        console.log("Inputs ", inputs);

        const result = await Vertex.run(state, inputs)

        emit(b => b.nodeCompleted(activeNode.id, result))

        return {
            node_outputs: {
                [activeNode.id]: result
            }
        };
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
    private resolveInputs(
        state: Runtime.State,
        nodeId: Workflow.Node.Id,
        workflow: Workflow,
        workflowCache: Workflow.Cache
    ): Record<Foundations.Port.Input.Id, any> {
        const node = workflow.data.nodes[nodeId];
        const staticValues = workflow.data.staticValues[nodeId] ?? {};

        const resolved: Record<Foundations.Port.Input.Id, any> = {};

        const incomingEdgeByPort = workflowCache.inputHandlesMap[nodeId]

        for (const input of node.inputs) {
            const edgeId = incomingEdgeByPort[input.id]
            const edge = workflow.data.edges[edgeId];

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
                const fallback = "initialValue" in input ? input.initialValue : undefined;
                const raw = staticValue ?? fallback;

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
        engineState: Runtime.State,
    ): AsyncIterable<StreamEvent> {
        const stream = await compiledGraph.stream(engineState, {
            streamMode: ["values", "messages", "updates"]
        })

        const conversationSourceNodeId = engineState.streamController.conversationSourceNodeId;

        for await (const [mode, payload] of stream) {
            switch (mode) {
                case "messages":
                    const [msgChunk, metadata] = payload
                    const nodeId = metadata.langgraph_node as Workflow.Node.Id
                    const rawContent = msgChunk.content;
                    const content = typeof rawContent === "string"
                        ? rawContent
                        : rawContent
                            .map(b => typeof b === "string" ? b : ("text" in b ? b.text : ""))
                            .join("");

                    const isConversation = conversationSourceNodeId === nodeId;

                    yield {
                        mode: isConversation ? "conversation" : "messages",
                        nodeId,
                        content
                    }
                    break;
                case "values":
                    yield {
                        mode,
                        state: payload
                    }
                    break;
                case "updates":
                    yield {
                        mode,
                        update: payload
                    }
                    break;
            }
        }
    }


    public async run(initialInputs: Record<string, any>) {
        const state = cloneDeep(Orchestrator.SerializableState.INITIAL)
        // return await this.compiledGraph.invoke(state);
    }
}
