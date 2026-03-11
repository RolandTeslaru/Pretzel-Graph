import { WorkflowCompiler } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { Foundations, Orchestrator, ExecutionSession } from "@vx-agent-editor/shared/domain";
import { RuntimeNode, RuntimeState, RuntimeContext } from "./runtime"
import { StateController } from "./runtime/state";
import { S2Engine } from "./S2Engine";
import { Emitter } from "./event/emitter";
import { Synthesizer } from "./synthesizer";
import { S2Graph } from "./S2Engine/graph";

export class AggexEngine {
    constructor() { }

    public static async runNode(
        wfNode: Workflow.Node,
        nodeInstance: RuntimeNode<Foundations.Blueprint>,
        context: RuntimeContext
    ) {
        console.log(`Executing Node: ${wfNode.displayName} (${wfNode.id})`);
        
        const state = context.stateController.get();

        context.emit({
            jobId: state.chatId as string as Orchestrator.Job.Id, // Fallback if jobId not in state
            workflowId: context.workflow.id,
            type: "node:started",
            nodeId: wfNode.id,
            topic: Orchestrator.Event.getTopic(state.chatId as string as Orchestrator.Job.Id)
        } satisfies Orchestrator.Event.Job.Node.Started)

        const inputs = this.resolveInputs(state, wfNode.id, context);

        try {
            const result = await nodeInstance.run(state, inputs)

            context.emit({
                jobId: state.chatId as string as Orchestrator.Job.Id,
                workflowId: context.workflow.id,
                type: "node:completed",
                nodeId: wfNode.id,
                topic: Orchestrator.Event.getTopic(state.chatId as string as Orchestrator.Job.Id),
                output: result
            } satisfies Orchestrator.Event.Job.Node.Completed)

            // Emit the update event for Orchestrator monitoring
            context.emit({
                jobId: state.chatId as string as Orchestrator.Job.Id,
                workflowId: context.workflow.id,
                type: "update",
                topic: Orchestrator.Event.getTopic(state.chatId as string as Orchestrator.Job.Id),
                update: {
                    node_outputs: {
                        [wfNode.id]: result
                    }
                } as any
            } satisfies Orchestrator.Event.Job.Update)

            // Update the state using our new strict Manager
            context.stateController.update({
                node_outputs: {
                    [wfNode.id]: result
                }
            } as any);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            context.emit({
                jobId: state.chatId as string as Orchestrator.Job.Id,
                workflowId: context.workflow.id,
                type: "node:error",
                nodeId: wfNode.id,
                topic: Orchestrator.Event.getTopic(state.chatId as string as Orchestrator.Job.Id),
                error: errorMessage
            } satisfies Orchestrator.Event.Job.Node.Error)
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
    private static resolveInputs(
        state: RuntimeState,
        nodeId: Workflow.Node.Id,
        context: RuntimeContext
    ): Record<Foundations.Port.Input.Id, any> {
        const workflow = context.workflow;
        const workflowCache = context.workflowCache

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
                    resolved[input.id] = rawReference;
                }
            } else {
                // ── No edge: synthesize from static value or initialValue ──
                const staticValue = staticValues[input.id];
                const fallback = "initialValue" in input ? input.initialValue : undefined;
                const raw = staticValue ?? fallback;

                if (raw !== undefined) {
                    resolved[input.id] = raw as Foundations.Field.Value;
                }
            }
        }

        return resolved;
    }


    public async start(
        compiledGraph: S2Graph,
        context: RuntimeContext
    ) {
        try {
            
            const s2Engine = new S2Engine();
            
            await s2Engine.ignite(compiledGraph);

            return context.stateController.get();
        } catch (err) {
            console.error("Error during compilation of workflow ", context.workflow.id, err)

            context.emit({
                jobId: context.jobId,
                workflowId: context.workflow.id,
                type:  "compilation:failed",
                topic: Orchestrator.Event.getTopic(context.jobId),
                error: err instanceof Error ? err.message : String(err)
            } satisfies Orchestrator.Event.Compilation.Failed)

            throw err;
        }
    }
}