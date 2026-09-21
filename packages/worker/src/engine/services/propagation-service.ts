import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { Execution } from "@pretzel-graph/shared/domain";
import type { AggexEngine } from "../index";
import { ExecutionContext } from "../execution-context";

/**
 * Output propagation: walks a node's outgoing edges, marks them `waiting`
 * (+runCount), signals each target via the scheduler, and emits the edge-state
 * update. `emitPort` propagates one output port; `emitNode` propagates all of them.
 */
export class PropagationService {
    constructor(private engine: AggexEngine) {}

    private get ctx(): ExecutionContext { return this.engine.ctx; }

    public readonly emitPort = (
        nodeId:   Workflow.Node.Id,
        outputId: Port.Output.Id,
    ) => {
        const edges = Object.values(this.ctx.workflowCache.edges).filter(edge =>
            edge.source.nodeId === nodeId &&
            edge.source.portId === outputId
        );

        const edgeIds: Record<string, Workflow.Edge.Id> = {};
        for (const edge of edges)
            edgeIds[edge.id] = edge.id;

        const edgeStateUpdate = this.engine.services.session.createEdgeStateUpdate(
            edgeIds,
            "waiting",
            state => { state.runCount += 1; },
        );

        for (const edge of edges)
            this.engine.services.scheduler.signalNode(edge.target.nodeId, nodeId);

        this.ctx.realtimeAPI.emit(Execution.Event.create("session:patch", {
            sessionPatch: {
                upsert: { edge_state: edgeStateUpdate },
            },
        }));
    }

    public readonly emitNode = (
        nodeId: Workflow.Node.Id,
    ) => {
        const node = this.ctx.workflowData.nodes[nodeId];
        if (!node) return;

        const allEdgeIds: Record<string, Workflow.Edge.Id> = {};

        const outputs = this.ctx.workflowQueryAPI.getOutputs(nodeId);

        for (const output of outputs)
            for (const edge of Object.values(this.ctx.workflowCache.edges))
                if (edge.source.nodeId === nodeId && edge.source.portId === output.id)
                    allEdgeIds[edge.id] = edge.id;

        const edgeStateUpdate = this.engine.services.session.createEdgeStateUpdate(
            allEdgeIds,
            "waiting",
            state => { state.runCount += 1; },
        );

        for (const edgeId of Object.values(allEdgeIds)) {
            const edge = this.ctx.workflowCache.edges[edgeId];

            this.engine.services.scheduler.signalNode(edge.target.nodeId, nodeId);
        }

        this.ctx.realtimeAPI.emit(Execution.Event.create("session:patch", {
            sessionPatch: {
                upsert: { edge_state: edgeStateUpdate },
            },
        }));
    }
}
