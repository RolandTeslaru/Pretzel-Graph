import { WorkflowCompiler } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { Foundations, Orchestrator, Execution } from "@vx-agent-editor/shared/domain";
import { Synthesizer } from "./synthesizer";
import { RuntimeNode, RuntimeState, RuntimeCompiledGraph } from "./runtime"
import { Emitter } from "./event/emitter";

export type StreamEvent =
    | { mode: "values"; state: RuntimeState }
    | { mode: "messages"; nodeId: Workflow.Node.Id; content: string; isChatOutput?: boolean }
    | { mode: "updates"; update: RuntimeState.Update }

export class AggexEngine {
    private compiler = new WorkflowCompiler();

    constructor() { }

    private async runNode(
        state: RuntimeState,
        activeNode: Workflow.Node,
        nodeInstance: RuntimeNode<Foundations.Blueprint>,
        workflow: Workflow,
        workflowCache: Workflow.Cache,
        emit: Emitter
    ) {
        console.log(`Executing Node: ${activeNode.displayName} (${activeNode.id})`);

        emit(b => b.workflow.node.started(activeNode.id))

        const inputs = this.resolveInputs(state, activeNode.id, workflow, workflowCache);


        try {
            const result = await nodeInstance.run(state, inputs)
            emit(b => b.workflow.node.completed(activeNode.id, result))

            return {
                node_outputs: {
                    [activeNode.id]: result
                }
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            emit(b => b.workflow.node.error(activeNode.id, errorMessage))
        }        
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
        state: RuntimeState,
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


    public compile(
        workflow: Workflow,
        emit: Emitter, 
        executionContext: Execution.Context
    ) {
        return this.compiler.compile(workflow, emit, this.runNode.bind(this), executionContext)
    }

    public async *stream(
        compiledGraph: RuntimeCompiledGraph,
        engineState: RuntimeState,
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
                        mode: "messages",
                        nodeId,
                        content,
                        isChatOutput: isConversation
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
        // return await this.compiledGraph.invoke(state);
    }
}