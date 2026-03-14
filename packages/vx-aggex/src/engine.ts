import { CompilationResult } from "./compiler";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { ExecutionSession, Foundations, Orchestrator } from "@vx-agent-editor/shared/domain";
import { RuntimeNode } from "./node"
import { ExecutionContext } from "./context";
import { S2Engine, S2Hooks } from "./S2";
import { Vertex } from "./S2/graph";
import { Synthesizer } from "./synthesizer";

export class AggexEngine {
    private s2Engine: S2Engine | null = null;

    constructor() { }

    private async runNode(
        wfNode: Workflow.Node,
        nodeInstance: RuntimeNode<Foundations.Blueprint>,
        ctx: ExecutionContext
    ) {
        const inputs = this.resolveInputs(ctx, wfNode.id);
        const result = await nodeInstance.run(inputs);

        console.log("RUNNNING NODE ", wfNode.id)

        ctx.updateSession(d => {
            d.node_outputs[wfNode.id] = result;
        });
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


    public async run(
        { compiledGraph, context, nodeInstanceMap }: CompilationResult
    ) {
        this.s2Engine = new S2Engine();

        const channel = ExecutionSession.Event.getChannel(context.session.id)

        const hooks: S2Hooks = {
            onVertexFired: (vertexId) => {
                const entry = nodeInstanceMap.get(vertexId);
                if (!entry) return;

                context.emit<ExecutionSession.Event.Node.Started>({
                    workflowId: context.workflow.id,
                    type: "node:started",
                    executionSessionId: context.session.id,
                    nodeId: entry.wfNode.id,
                    channel,
                });
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

                context.emit<ExecutionSession.Event.Node.Completed>({
                    executionSessionId: context.session.id,
                    workflowId: context.workflow.id,
                    type: "node:completed",
                    nodeId: entry.wfNode.id,
                    channel,
                    output,
                });
            },
            onVertexWaiting: (vertexId, dependencyResolutionMap, totalDeps) => {
                const entry = nodeInstanceMap.get(vertexId);
                if (!entry) return;

                const { instance, wfNode } = entry;

                const nodeDepMap: Record<Workflow.Node.Id, boolean> = {};
                for (const [depId, resolved] of Object.entries(dependencyResolutionMap)) {
                    nodeDepMap[depId as unknown as Workflow.Node.Id] = resolved;
                }

                context.emit<ExecutionSession.Event.Node.Waiting>({
                    executionSessionId: context.session.id,
                    workflowId: context.workflow.id,
                    type: "node:waiting",
                    nodeId: wfNode.id,
                    channel,
                    dependencyResolutionMap: nodeDepMap,
                    totalDeps
                });

                const partialInputs = this.resolveInputs(context, wfNode.id);
                instance.wait(partialInputs, nodeDepMap);
            },
            onVertexError(vertexId, error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                console.error(`Error during node execution, ${vertexId}:`, error)

                context.emit<ExecutionSession.Event.Node.Error>({
                    executionSessionId: context.session.id,
                    workflowId: context.workflow.id,
                    type: "node:error",
                    nodeId: vertexId as unknown as Workflow.Node.Id,
                    channel,
                    error: errorMessage
                })
            },
        };

        await this.s2Engine.ignite(compiledGraph, hooks);
    }
}