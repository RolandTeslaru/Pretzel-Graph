"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const domain_1 = require("../../../shared/domain");
const system_1 = require("../../../shared/system");
/**
 * The live-state projection of the execution lifecycle (parallel to FlightRecorderService,
 * which owns the recording projection). The engine's S2 hooks call the `onNodeX` methods,
 * which own every Execution.Session mutation + `node:*` event emit. `createEdgeStateUpdate`
 * is a shared primitive the other services emit through.
 */
class SessionService {
    /**
     * Mutates edge states in the session and returns the updated entries for event emission.
     * @param edgeIds   — edge ID map from the workflow cache
     * @param status    — the status to set on each edge
     * @param onUpdate  — optional callback applied to each edge state after status is set (e.g. runCount increment)
     */
    createEdgeStateUpdate(ctx, edgeIds, status, onUpdate) {
        ctx.updateSession(d => {
            if (!d.edge_state)
                d.edge_state = {};
            for (const edgeId of Object.values(edgeIds)) {
                if (!d.edge_state[edgeId])
                    d.edge_state[edgeId] = { status, runCount: 0 };
                else
                    d.edge_state[edgeId].status = status;
                if (onUpdate)
                    onUpdate(d.edge_state[edgeId]);
            }
        });
        const update = {};
        for (const edgeId of Object.values(edgeIds))
            update[edgeId] = ctx.session.edge_state[edgeId];
        return update;
    }
    // ── Lifecycle observers ─────────────────────────────────────────────────
    /** Node fired: incoming edges → completed, outgoing → preparing (strategy "all" only),
     *  node → running. Emits `node:started`. */
    onNodeFired(ctx, entry) {
        const { workflowCache } = ctx;
        const edgeStateUpdate = {};
        const incomingEdges = workflowCache.incomingEdgesMap[entry.wfNode.id];
        if (incomingEdges)
            Object.assign(edgeStateUpdate, this.createEdgeStateUpdate(ctx, incomingEdges, "completed"));
        // Skip outgoing for "router" (branch unknown yet) and "none" (node manages its own).
        if (entry.instance.getPropagationStrategy() === "all") {
            const outgoingEdges = workflowCache.outgoingEdgesMap[entry.wfNode.id];
            if (outgoingEdges)
                Object.assign(edgeStateUpdate, this.createEdgeStateUpdate(ctx, outgoingEdges, "preparing"));
        }
        const nodeStatus = {
            status: "running",
            started_at: new Date().toISOString(),
        };
        const nodeStatusUpdate = { [entry.wfNode.id]: nodeStatus };
        ctx.updateSession(d => { Object.assign(d.node_status, nodeStatusUpdate); });
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("node:started", {
            nodeId: entry.wfNode.id,
            sessionPatch: {
                upsert: {
                    edge_state: edgeStateUpdate,
                    node_status: nodeStatusUpdate,
                },
            },
        }));
    }
    /** Node produced output: merge instances + projections into the session. No emit
     *  (the projections are surfaced on `node:completed`). */
    onNodeExecuted(ctx, nodeId, result, projected) {
        ctx.updateSession(d => {
            d.node_output_instances[nodeId] = {
                ...(d.node_output_instances[nodeId] ?? {}),
                ...result,
            };
            d.node_output_projections[nodeId] = {
                ...(d.node_output_projections[nodeId] ?? {}),
                ...projected,
            };
        });
    }
    /** Node completed: outgoing edges → waiting (+runCount; router → taken branches only,
     *  "none" → skip), node → completed. Emits `node:completed` with projected output. */
    onNodeCompleted(ctx, entry, resolvedOutSignals) {
        const { session, workflowCache } = ctx;
        const allOutgoingEdges = workflowCache.outgoingEdgesMap[entry.wfNode.id];
        let edgeStateUpdate = {};
        if (allOutgoingEdges) {
            const strategy = entry.instance.getPropagationStrategy();
            if (strategy === "router" && resolvedOutSignals) {
                const takenEdges = {};
                for (const [targetId, edgeId] of Object.entries(allOutgoingEdges)) {
                    if (resolvedOutSignals.has(targetId))
                        takenEdges[targetId] = edgeId;
                }
                edgeStateUpdate = this.createEdgeStateUpdate(ctx, takenEdges, "waiting", s => { s.runCount += 1; });
            }
            else if (strategy === "none") {
                // Node managed its own edge state via propagationAPI — nothing to do
            }
            else {
                edgeStateUpdate = this.createEdgeStateUpdate(ctx, allOutgoingEdges, "waiting", s => { s.runCount += 1; });
            }
        }
        const existing = session.node_status[entry.wfNode.id];
        const nodeStatus = {
            status: "completed",
            started_at: existing?.started_at,
            completed_at: new Date().toISOString(),
        };
        const projectedOutput = session.node_output_projections[entry.wfNode.id];
        const nodeStatusUpdate = { [entry.wfNode.id]: nodeStatus };
        ctx.updateSession(d => {
            d.edge_state = { ...d.edge_state, ...edgeStateUpdate };
            Object.assign(d.node_status, nodeStatusUpdate);
        });
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("node:completed", {
            nodeId: entry.wfNode.id,
            output: projectedOutput,
            sessionPatch: {
                upsert: {
                    edge_state: edgeStateUpdate,
                    node_status: nodeStatusUpdate,
                    node_output_projections: {
                        [entry.wfNode.id]: projectedOutput,
                    },
                },
            },
        }));
        system_1.System.log.info("node completed", {
            nodeId: entry.wfNode.id,
            outputPorts: projectedOutput ? Object.keys(projectedOutput) : [],
        });
    }
    /** Node waiting on dependencies: node → waiting. Emits `node:waiting`. */
    onNodeWaiting(ctx, nodeId) {
        const existing = ctx.session.node_status[nodeId];
        const nodeStatus = {
            status: "waiting",
            started_at: existing?.started_at,
        };
        const nodeStatusUpdate = { [nodeId]: nodeStatus };
        ctx.updateSession(d => { Object.assign(d.node_status, nodeStatusUpdate); });
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("node:waiting", {
            nodeId: nodeId,
            sessionPatch: {
                upsert: { node_status: nodeStatusUpdate },
            },
        }));
    }
    /** Node failed: node → failed (carries the error). Emits `node:error`. */
    onNodeFailed(ctx, nodeId, error) {
        const existing = ctx.session.node_status[nodeId];
        const nodeStatus = {
            status: "failed",
            started_at: existing?.started_at,
            completed_at: new Date().toISOString(),
            error: error,
        };
        const nodeStatusUpdate = { [nodeId]: nodeStatus };
        ctx.updateSession(d => { Object.assign(d.node_status, nodeStatusUpdate); });
        ctx.realtimeAPI.emit(domain_1.Execution.Event.create("node:error", {
            nodeId: nodeId,
            error: error,
            sessionPatch: {
                upsert: { node_status: nodeStatusUpdate },
            },
        }));
    }
}
exports.SessionService = SessionService;
