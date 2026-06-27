import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { Execution } from "@pretzel-graph/shared/domain";
import type { AggexEngine } from "./index";

/**
 * Output propagation: walks a node's outgoing edges, marks them `waiting`
 * (+runCount), signals each target via the scheduler, and emits the edge-state
 * update. `emitPort` propagates one output port; `emitNode` propagates all of them.
 */
export class PropagationService {
    constructor(private engine: AggexEngine) {}

    public readonly emitPort = (
        ctx:      AggexEngine.Execution.Context,
        nodeId:   Workflow.Node.Id,
        outputId: Port.Output.Id,
    ) => {
        const edges = Object.values(ctx.workflowData.edges).filter(edge =>
            edge.source.nodeId === nodeId &&
            edge.source.portId === outputId
        );

        const edgeIds: Record<string, Workflow.Edge.Id> = {};
        for (const edge of edges)
            edgeIds[edge.id] = edge.id;

        const edgeStateUpdate = this.engine.session.createEdgeStateUpdate(
            ctx,
            edgeIds,
            "waiting",
            state => { state.runCount += 1; },
        );

        for (const edge of edges)
            this.engine.scheduler.signalNode(ctx, edge.target.nodeId, nodeId);

        ctx.emit<Execution.Event.SessionUpdate>({
            executionId: ctx.executionId,
            workflowId:  ctx.workflowId,
            type:        "update",
            channel:     this.engine.session.getEventChannel(ctx),
            sessionUpdate: {
                edge_state: edgeStateUpdate,
            },
        });
    }

    public readonly emitNode = (
        ctx:    AggexEngine.Execution.Context,
        nodeId: Workflow.Node.Id,
    ) => {
        const node = ctx.workflowData.nodes[nodeId];
        if (!node) return;

        const allEdgeIds: Record<string, Workflow.Edge.Id> = {};

        for (const output of node.outputs)
            for (const edge of Object.values(ctx.workflowData.edges))
                if (edge.source.nodeId === nodeId && edge.source.portId === output.id)
                    allEdgeIds[edge.id] = edge.id;

        const edgeStateUpdate = this.engine.session.createEdgeStateUpdate(
            ctx,
            allEdgeIds,
            "waiting",
            state => { state.runCount += 1; },
        );

        for (const edgeId of Object.values(allEdgeIds)) {
            const edge = ctx.workflowData.edges[edgeId];

            this.engine.scheduler.signalNode(ctx, edge.target.nodeId, nodeId);
        }

        ctx.emit<Execution.Event.SessionUpdate>({
            executionId: ctx.executionId,
            workflowId:  ctx.workflowId,
            type:        "update",
            channel:     this.engine.session.getEventChannel(ctx),
            sessionUpdate: {
                edge_state: edgeStateUpdate,
            },
        });
    }
}
