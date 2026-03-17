import { CompilationResult } from "../compiler";
import { Workflow } from "@vx-agent-editor/shared/domain/Workflow";
import { ExecutionSession, Foundations, Orchestrator } from "@vx-agent-editor/shared/domain";
import { z } from "zod";
import { RuntimeNode, RuntimeRouterNode } from "../node"
import { S2Engine, S2Hooks } from "../S2/engine";
import { Vertex } from "../S2/graph";
import { Synthesizer } from "../synthesizer";
import { ExecutionContext } from "../context";

export class AggexEngine {
    private s2Engine: S2Engine | null = null;

    constructor() { }

    private async runNode(
        wfNode: Workflow.Node,
        nodeInstance: RuntimeNode<Foundations.Blueprint>,
        ctx: ExecutionContext
    ): Promise<Set<Vertex.Id> | void> {
        const inputs = this.resolveInputs(ctx, wfNode.id);

        const result = await nodeInstance.run(inputs);

        console.log("RUNNNING NODE ", wfNode.id)

        ctx.updateSession(d => {
            d.node_outputs[wfNode.id] = result;
        });

        if ('isRouterNode' in nodeInstance) {
            return this.resolveRouterSignals(ctx, wfNode.id, result);
        }
    }

    private resolveRouterSignals(
        ctx: ExecutionContext,
        nodeId: Workflow.Node.Id,
        result: Record<string, any>
    ): Set<Vertex.Id> {
        const signals = new Set<Vertex.Id>();
        const edges = ctx.workflow.data.edges;
        const returnedKeys = new Set(Object.keys(result));

        for (const edge of Object.values(edges)) {
            if (edge.source.nodeId === nodeId && returnedKeys.has(edge.source.portId)) {
                signals.add(edge.target.nodeId as unknown as Vertex.Id);
            }
        }

        return signals;
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


    public async run({
        compiledGraph, context, nodeInstanceMap
    }: CompilationResult) {
        this.s2Engine = new S2Engine();

        const channel = ExecutionSession.Event.getChannel(context.session.id)

        const hooks: S2Hooks = {
            onVertexFired: (vertexId) => {
                const entry = nodeInstanceMap.get(vertexId);
                if (!entry) return;

                // Set all incoming (dependency) edges to completed
                const incomingEdges = context.workflowCache.incomingEdgesMap[entry.wfNode.id];
                if (incomingEdges) {
                    context.updateSession(d => {
                        if (!d.edge_state) d.edge_state = {};
                        for (const edgeId of Object.values(incomingEdges)) {
                            if (d.edge_state[edgeId]) {
                                d.edge_state[edgeId].status = "completed";
                            }
                        }
                    });

                    const edgeStateUpdate: ExecutionSession["edge_state"] = {};
                    for (const edgeId of Object.values(incomingEdges)) {
                        if (context.session.edge_state[edgeId]) {
                            edgeStateUpdate[edgeId] = context.session.edge_state[edgeId];
                        }
                    }

                    context.emit<z.infer<typeof ExecutionSession.Event.Update>>({
                        executionSessionId: context.session.id,
                        workflowId: context.workflow.id,
                        type: "update",
                        channel,
                        update: { edge_state: edgeStateUpdate },
                    });
                }

                // Set all outgoing edges to preparing
                const outgoingEdgesFired = context.workflowCache.outgoingEdgesMap[entry.wfNode.id];
                if (outgoingEdgesFired) {
                    context.updateSession(d => {
                        if (!d.edge_state) d.edge_state = {};
                        for (const edgeId of Object.values(outgoingEdgesFired)) {
                            if (!d.edge_state[edgeId]) {
                                d.edge_state[edgeId] = { status: "preparing", runCount: 0 };
                            } else {
                                d.edge_state[edgeId].status = "preparing";
                            }
                        }
                    });

                    const preparingUpdate: ExecutionSession["edge_state"] = {};
                    for (const edgeId of Object.values(outgoingEdgesFired)) {
                        preparingUpdate[edgeId] = context.session.edge_state[edgeId];
                    }

                    context.emit<z.infer<typeof ExecutionSession.Event.Update>>({
                        executionSessionId: context.session.id,
                        workflowId: context.workflow.id,
                        type: "update",
                        channel,
                        update: { edge_state: preparingUpdate },
                    });
                }

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

                // Set all outgoing edges to waiting and increment runCount
                const outgoingEdges = context.workflowCache.outgoingEdgesMap[entry.wfNode.id];
                if (outgoingEdges) {
                    context.updateSession(d => {
                        if (!d.edge_state) d.edge_state = {};
                        for (const edgeId of Object.values(outgoingEdges)) {
                            if (!d.edge_state[edgeId]) {
                                d.edge_state[edgeId] = { status: "waiting", runCount: 0 };
                            }
                            d.edge_state[edgeId].status = "waiting";
                            d.edge_state[edgeId].runCount += 1;
                        }
                    });

                    const edgeStateUpdate: ExecutionSession["edge_state"] = {};
                    for (const edgeId of Object.values(outgoingEdges)) {
                        edgeStateUpdate[edgeId] = context.session.edge_state[edgeId];
                    }

                    context.emit<z.infer<typeof ExecutionSession.Event.Update>>({
                        executionSessionId: context.session.id,
                        workflowId: context.workflow.id,
                        type: "update",
                        channel,
                        update: { edge_state: edgeStateUpdate },
                    });
                }

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