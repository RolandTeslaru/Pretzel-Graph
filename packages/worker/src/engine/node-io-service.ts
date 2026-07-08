import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { Vertex } from "../S2/graph";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Projection } from "@pretzel-graph/shared/domain/Foundations/Projection";
import { Execution } from "@pretzel-graph/shared/domain";
import { Synthesizer } from "@pretzel-graph/node-sdk";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { AggexExecutionError } from "src/errors";
import type { AggexEngine } from "./index";

/**
 * A node's input/output data plane: resolve its incoming inputs from edges/static
 * values (`getIncomingData`), project its outputs for emission (`projectOutputs`),
 * and write a single output port value (`write`). Pure `ctx`-in — reaches back only
 * for the event channel.
 */
export class NodeIOService {
    constructor(private engine: AggexEngine) {}

    public readonly writePort = (
        ctx:      AggexEngine.Execution.Context,
        nodeId:   Workflow.Node.Id,
        outputId: Port.Output.Id,
        value:    unknown,
    ) => {
        const outputPort = this.getOutputPort(ctx, nodeId, outputId);

        const projection = Synthesizer.project(value, outputPort.variant);

        ctx.updateSession(d => {
            d.node_output_instances[nodeId] ??= {};
            d.node_output_projections[nodeId] ??= {};

            d.node_output_instances[nodeId][outputId] = value;
        d.node_output_projections[nodeId][outputId] = projection;
        });

        ctx.realtimeAPI.emit<Execution.Event.SessionUpdate>({
            executionId: ctx.executionId,
            workflowId:  ctx.workflowId,
            type:        "update",
            channel:     this.engine.session.getEventChannel(ctx),
            sessionUpdate: {
                node_output_projections: {
                    [nodeId]: {
                        [outputId]: projection,
                    },
                },
            },
        });
    }

    public readonly getIncomingData = (
        ctx:             AggexEngine.Execution.Context,
        nodeId:          Workflow.Node.Id,
        incomingSignals: Set<Workflow.Node.Id | Vertex.Id> = new Set(),
        keepMissingPorts = false,
    ): Record<Port.Input.Id, any> => {
        const staticValues = ctx.workflowData.staticValues[nodeId] ?? {};

        const resolved: Record<Port.Input.Id, any> = {};

        const incomingEdgeByPort = ctx.workflowCache.inputHandlesMap[nodeId]

        for (const input of this.getInputPorts(ctx, nodeId)) {
            const edgeId = incomingEdgeByPort[input.id]
            const edge = ctx.workflowCache.edges[edgeId];

            if (edge) {
                if(incomingSignals.has(edge.source.nodeId) === false){
                    if(keepMissingPorts)
                        resolved[input.id] = undefined;
                    continue;
                }

                const sourceOutputs = ctx.session.node_output_instances[edge.source.nodeId];
                if (sourceOutputs) {
                    const rawReference = sourceOutputs[edge.source.portId as string];
                    // undefined = nothing produced yet (keep waiting).
                    // null      = produced-but-empty, only ExposeInputPort emits it (settled).
                    // Keep them distinct; null bypasses ensureReference (which would throw).
                    if(rawReference === undefined)
                        resolved[input.id] = undefined;
                    else if(rawReference === null)
                        resolved[input.id] = null;
                    else
                        resolved[input.id] = Synthesizer.ensureReference(rawReference, input.variant);
                }
                else {
                    resolved[input.id] = undefined;
                }
            } else {
                const staticValue = staticValues[input.id];
                const fallback = "initialValue" in input ? input.initialValue : undefined;
                const raw = staticValue ?? fallback;

                if (raw !== undefined) {
                    resolved[input.id] = raw as Field.Value;
                }
                else {
                    resolved[input.id] = undefined;
                }
            }
        }

        return resolved;
    }

    public readonly projectOutputs = (
        ctx: AggexEngine.Execution.Context,
        result: Record<string, any>,
        wfNode: Workflow.Node.Raw
    ): Record<Port.Output.Id, Projection> => {
        const projected: Record<Port.Output.Id, Projection> = {};

        for (const output of this.getOutputPorts(ctx, wfNode.id)) {
            const key = output.id;
            if (key in result){
                if(result[key] === undefined)
                    projected[key] = undefined as unknown as Projection;
                else
                    projected[key] = Synthesizer.project(result[key], output.variant);
            }
        }

        return projected;
    }


    // A node's live ports, via the shared resolver: reconciled blueprint ports + the node's added
    // ports (or a subworkflow's dependency-exposed ports), with polymorphic variants replayed.
    public readonly getInputPorts = (
        ctx:    AggexEngine.Execution.Context,
        nodeId: Workflow.Node.Id,
    ): Port.Input[] => {
        const blueprint = ctx.catalogueAPI.getBlueprint(nodeId);
        const node = ctx.workflowData.nodes[nodeId];
        return Workflow.Node.resolveInputs(blueprint.inputs, node, this.getNodeDependency(ctx, node));
    }

    public readonly getOutputPorts = (
        ctx:    AggexEngine.Execution.Context,
        nodeId: Workflow.Node.Id,
    ): Port.Output[] => {
        const blueprint = ctx.catalogueAPI.getBlueprint(nodeId);
        const node = ctx.workflowData.nodes[nodeId];
        return Workflow.Node.resolveOutputs(blueprint.outputs, node, this.getNodeDependency(ctx, node));
    }

    // Resolve a node's attached subworkflow dependency record from the workflow's dependency state,
    // so its exposed ports derive at runtime just like on the frontend / during validation.
    private getNodeDependency(ctx: AggexEngine.Execution.Context, node: Workflow.Node.Raw): Workflow.Dependency | null {
        const ref = node.dependencyRef;
        if (!ref) return null;
        const store = ref.mode === "publication" ? ctx.workflowData.dependencies.published : ctx.workflowData.dependencies.draft;
        return store[ref.workflowId] ?? null;
    }

    private getOutputPort(ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id, outputId: Port.Output.Id): Port.Output {
        const node = ctx.workflowData.nodes[nodeId];
        if (!node)
            throw new AggexExecutionError(
                SystemError.Code.EXECUTION_NODE_FAILED,
                `Cannot write output for unknown node "${nodeId}"`,
            );

        const output = this.getOutputPorts(ctx, nodeId).find(output => output.id === outputId);
        if (!output)
            throw new AggexExecutionError(
                SystemError.Code.EXECUTION_NODE_FAILED,
                `Cannot write unknown output port "${outputId}" on node "${nodeId}"`,
            );
        return output;
    }
}
