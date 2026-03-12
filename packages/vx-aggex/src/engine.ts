import { CompilationResult } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/domain";
import { RuntimeNode } from "./node"
import { ExecutionContext } from "./context";
import { S2Engine, S2Hooks } from "./S2";
import { Vertex } from "./S2/graph";
import { Synthesizer } from "./synthesizer";

export class AggexEngine {
    constructor() { }

    private async runNode(
        wfNode: Workflow.Node,
        nodeInstance: RuntimeNode<Foundations.Blueprint>,
        ctx: ExecutionContext
    ) {
        const inputs = this.resolveInputs(ctx, wfNode.id);
        const result = await nodeInstance.run(inputs);

        // console.log(`Node ${wfNode.id} produced the result`, JSON.stringify(result, null, 2))

        ctx.updateSession(d => {
            d.node_outputs[wfNode.id] = result;
        });

        console.log(`Session after vertex ${wfNode.id} runs `, JSON.stringify(ctx.session, null, 2))
    }

    private resolveInputs(
        context: ExecutionContext,
        nodeId: Workflow.Node.Id,
    ): Record<Foundations.Port.Input.Id, any> {
        const { workflow, workflowCache, session } = context;

        const node = workflow.data.nodes[nodeId];
        const staticValues = workflow.data.staticValues[nodeId] ?? {};

        const resolved: Record<Foundations.Port.Input.Id, any> = {};

        const incomingEdgeByPort = workflowCache.inputHandlesMap[nodeId]

        for (const input of node.inputs) {
            const edgeId = incomingEdgeByPort[input.id]
            const edge = workflow.data.edges[edgeId];

            if (edge) {
                const sourceOutputs = session.node_outputs[edge.source.nodeId];
                if (sourceOutputs) {
                    const rawReference = sourceOutputs[edge.source.portId as string];
                    resolved[input.id] = Synthesizer.ensureReference(rawReference, input.variant);
                }
            } else {
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
        { compiledGraph, context, nodeInstanceMap }: CompilationResult
    ) {
        const topic = Orchestrator.Event.getTopic(context.jobId);

        try {
            const s2Engine = new S2Engine();

            const hooks: S2Hooks = {
                onVertexFired: (vertexId) => {
                    const entry = nodeInstanceMap.get(vertexId);
                    if (!entry) return;

                    context.emit({
                        jobId: context.jobId,
                        workflowId: context.workflow.id,
                        type: "node:started",
                        nodeId: entry.wfNode.id,
                        topic,
                    } satisfies Orchestrator.Event.Job.Node.Started);
                },

                onVertexExecute: async (vertexId: Vertex.Id) => {
                    const entry = nodeInstanceMap.get(vertexId);
                    if (!entry) return;

                    await this.runNode(entry.wfNode, entry.instance, context);
                },

                onVertexCompleted: (vertexId) => {
                    const entry = nodeInstanceMap.get(vertexId);
                    if (!entry) return;

                    const output = context.session.node_outputs[entry.wfNode.id];

                    context.emit({
                        jobId: context.jobId,
                        workflowId: context.workflow.id,
                        type: "node:completed",
                        nodeId: entry.wfNode.id,
                        topic,
                        output,
                    } satisfies Orchestrator.Event.Job.Node.Completed);
                },

                onVertexWaiting: (vertexId, resolvedDependencies) => {
                    const entry = nodeInstanceMap.get(vertexId);
                    if (!entry) return;

                    const { instance, wfNode } = entry;

                    const depResolutionMap: Record<Workflow.Node.Id, boolean> = {};
                    const dependencies = compiledGraph.dependenciesMap.get(vertexId)!;
                    for (const depId of dependencies) {
                        const depNodeId = depId as unknown as Workflow.Node.Id;
                        depResolutionMap[depNodeId] = resolvedDependencies.has(depId);
                    }

                    const partialInputs = this.resolveInputs(context, wfNode.id);
                    instance.wait(partialInputs, depResolutionMap);
                },
                onVertexError(vertexId, error) {
                    const errorMessage = error instanceof Error ? error.message : String(error)

                    console.error(`Error during node execution execution, ${vertexId} `, error)

                    context.emit({
                        jobId: context.jobId,
                        workflowId: context.workflow.id,
                        type: "node:error",
                        nodeId: vertexId as unknown as Workflow.Node.Id,
                        topic,
                        error: errorMessage
                    } satisfies Orchestrator.Event.Job.Node.Error)
                },
            };

            await s2Engine.ignite(compiledGraph, hooks);

            return context.session;
        } catch (err) {
            console.error("Error during execution of workflow ", context.workflow.id, err)

            context.emit({
                jobId: context.jobId,
                workflowId: context.workflow.id,
                type: "compilation:failed",
                topic: Orchestrator.Event.getTopic(context.jobId),
                error: err instanceof Error ? err.message : String(err)
            } satisfies Orchestrator.Event.Compilation.Failed)

            throw err;
        }
    }
}
