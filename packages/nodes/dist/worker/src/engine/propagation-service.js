"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropagationService = void 0;
const domain_1 = require("../../../shared/domain");
/**
 * Output propagation: walks a node's outgoing edges, marks them `waiting`
 * (+runCount), signals each target via the scheduler, and emits the edge-state
 * update. `emitPort` propagates one output port; `emitNode` propagates all of them.
 */
class PropagationService {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    emitPort = (ctx, nodeId, outputId) => {
        const edges = Object.values(ctx.workflowCache.edges).filter(edge => edge.source.nodeId === nodeId &&
            edge.source.portId === outputId);
        const edgeIds = {};
        for (const edge of edges)
            edgeIds[edge.id] = edge.id;
        const edgeStateUpdate = this.engine.services.session.createEdgeStateUpdate(ctx, edgeIds, "waiting", state => { state.runCount += 1; });
        for (const edge of edges)
            this.engine.services.scheduler.signalNode(ctx, edge.target.nodeId, nodeId);
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("session:patch", {
            sessionPatch: {
                upsert: { edge_state: edgeStateUpdate },
            },
        }));
    };
    emitNode = (ctx, nodeId) => {
        const node = ctx.workflowData.nodes[nodeId];
        if (!node)
            return;
        const allEdgeIds = {};
        const outputs = ctx.workflowQueryAPI.getOutputs(nodeId);
        for (const output of outputs)
            for (const edge of Object.values(ctx.workflowCache.edges))
                if (edge.source.nodeId === nodeId && edge.source.portId === output.id)
                    allEdgeIds[edge.id] = edge.id;
        const edgeStateUpdate = this.engine.services.session.createEdgeStateUpdate(ctx, allEdgeIds, "waiting", state => { state.runCount += 1; });
        for (const edgeId of Object.values(allEdgeIds)) {
            const edge = ctx.workflowCache.edges[edgeId];
            this.engine.services.scheduler.signalNode(ctx, edge.target.nodeId, nodeId);
        }
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("session:patch", {
            sessionPatch: {
                upsert: { edge_state: edgeStateUpdate },
            },
        }));
    };
}
exports.PropagationService = PropagationService;
