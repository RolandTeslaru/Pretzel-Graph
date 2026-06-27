import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { Vertex } from "../S2/graph";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { Projection } from "@pretzel-graph/shared/domain/Foundations/Projection";
import { Execution } from "@pretzel-graph/shared/domain";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { System } from "@pretzel-graph/shared/system";
import type { AggexEngine } from "./index";

type NodeEntry = { wfNode: Workflow.Node; instance: RuntimeNode<Blueprint> };

/**
 * The live-state projection of the execution lifecycle (parallel to FlightRecorderService,
 * which owns the recording projection). The engine's S2 hooks call the `onNodeX` methods,
 * which own every Execution.Session mutation + `node:*` event emit. `createEdgeStateUpdate`
 * and `getEventChannel` are shared primitives the other services emit through.
 */
export class SessionService {

    public getEventChannel(ctx: AggexEngine.Execution.Context): Execution.Event.Channel {
        return Execution.Event.getChannel(ctx.executionId);
    }

    /**
     * Mutates edge states in the session and returns the updated entries for event emission.
     * @param edgeIds   — edge ID map from the workflow cache
     * @param status    — the status to set on each edge
     * @param onUpdate  — optional callback applied to each edge state after status is set (e.g. runCount increment)
     */
    public createEdgeStateUpdate(
        ctx:       AggexEngine.Execution.Context,
        edgeIds:   Record<string, Workflow.Edge.Id>,
        status:    Execution.Session.EdgeState["status"],
        onUpdate?: (state: Execution.Session.EdgeState) => void,
    ): Execution.Session["edge_state"] {
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

        const update: Execution.Session["edge_state"] = {};
        for (const edgeId of Object.values(edgeIds))
            update[edgeId] = ctx.session.edge_state[edgeId];

        return update;
    }


    // ── Lifecycle observers ─────────────────────────────────────────────────


    /** Node fired: incoming edges → completed, outgoing → preparing (strategy "all" only),
     *  node → running. Emits `node:started`. */
    public onNodeFired(ctx: AggexEngine.Execution.Context, entry: NodeEntry): void {
        const { workflowCache } = ctx;
        const edgeStateUpdate: Execution.Session["edge_state"] = {};

        const incomingEdges = workflowCache.incomingEdgesMap[entry.wfNode.id];
        if (incomingEdges)
            Object.assign(edgeStateUpdate, this.createEdgeStateUpdate(ctx, incomingEdges, "completed"));

        // Skip outgoing for "router" (branch unknown yet) and "none" (node manages its own).
        if (entry.instance.getPropagationStrategy() === "all") {
            const outgoingEdges = workflowCache.outgoingEdgesMap[entry.wfNode.id];
            if (outgoingEdges)
                Object.assign(edgeStateUpdate, this.createEdgeStateUpdate(ctx, outgoingEdges, "preparing"));
        }

        const nodeStatus: Execution.Session.NodeStatus = {
            status:     "running",
            started_at: new Date().toISOString(),
        };
        const nodeStatusUpdate = { [entry.wfNode.id]: nodeStatus };

        ctx.updateSession(d => { Object.assign(d.node_status, nodeStatusUpdate); });

        ctx.emit<Execution.Event.Node.Started>({
            executionId:   ctx.executionId,
            workflowId:    ctx.workflowId,
            type:          "node:started",
            nodeId:        entry.wfNode.id,
            channel:       this.getEventChannel(ctx),
            sessionUpdate: {
                edge_state:  edgeStateUpdate,
                node_status: nodeStatusUpdate,
            },
        });
    }


    /** Node produced output: merge instances + projections into the session. No emit
     *  (the projections are surfaced on `node:completed`). */
    public onNodeExecuted(
        ctx:       AggexEngine.Execution.Context,
        nodeId:    Workflow.Node.Id,
        result:    Record<string, any>,
        projected: Record<Port.Output.Id, Projection>,
    ): void {
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
    public onNodeCompleted(
        ctx:                AggexEngine.Execution.Context,
        entry:              NodeEntry,
        resolvedOutSignals: Set<Vertex.Id> | void,
    ): void {
        const { session, workflowCache } = ctx;

        const allOutgoingEdges = workflowCache.outgoingEdgesMap[entry.wfNode.id];
        let edgeStateUpdate: Execution.Session["edge_state"] = {};

        if (allOutgoingEdges) {
            const strategy = entry.instance.getPropagationStrategy();

            if (strategy === "router" && resolvedOutSignals) {
                const takenEdges: Record<string, Workflow.Edge.Id> = {};
                for (const [targetId, edgeId] of Object.entries(allOutgoingEdges)) {
                    if (resolvedOutSignals.has(targetId as unknown as Vertex.Id))
                        takenEdges[targetId] = edgeId;
                }
                edgeStateUpdate = this.createEdgeStateUpdate(ctx, takenEdges, "waiting", s => { s.runCount += 1; });
            } else if (strategy === "none") {
                // Node managed its own edge state via propagationAPI — nothing to do
            } else {
                edgeStateUpdate = this.createEdgeStateUpdate(ctx, allOutgoingEdges, "waiting", s => { s.runCount += 1; });
            }
        }

        const existing = session.node_status[entry.wfNode.id];
        const nodeStatus: Execution.Session.NodeStatus = {
            status:       "completed",
            started_at:   existing?.started_at,
            completed_at: new Date().toISOString(),
        };
        const projectedOutput = session.node_output_projections[entry.wfNode.id];
        const nodeStatusUpdate = { [entry.wfNode.id]: nodeStatus };

        ctx.updateSession(d => {
            d.edge_state = { ...d.edge_state, ...edgeStateUpdate };
            Object.assign(d.node_status, nodeStatusUpdate);
        });

        ctx.emit<Execution.Event.Node.Completed>({
            executionId:   ctx.executionId,
            workflowId:    ctx.workflowId,
            type:          "node:completed",
            nodeId:        entry.wfNode.id,
            channel:       this.getEventChannel(ctx),
            output:        projectedOutput,
            sessionUpdate: {
                edge_state:  edgeStateUpdate,
                node_status: nodeStatusUpdate,
                node_output_projections: {
                    [entry.wfNode.id]: projectedOutput,
                },
            },
        });

        System.log.info("node completed", {
            name:        entry.wfNode.displayName,
            nodeId:      entry.wfNode.id,
            outputPorts: projectedOutput ? Object.keys(projectedOutput) : [],
        });
    }


    /** Node waiting on dependencies: node → waiting. Emits `node:waiting`. */
    public onNodeWaiting(ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id): void {
        const existing = ctx.session.node_status[nodeId];
        const nodeStatus: Execution.Session.NodeStatus = {
            status:     "waiting",
            started_at: existing?.started_at,
        };
        const nodeStatusUpdate = { [nodeId]: nodeStatus };

        ctx.updateSession(d => { Object.assign(d.node_status, nodeStatusUpdate); });

        ctx.emit<Execution.Event.Node.Waiting>({
            executionId:   ctx.executionId,
            workflowId:    ctx.workflowId,
            type:          "node:waiting",
            nodeId:        nodeId,
            channel:       this.getEventChannel(ctx),
            sessionUpdate: {
                node_status: nodeStatusUpdate,
            },
        });
    }


    /** Node failed: node → failed (carries the error). Emits `node:error`. */
    public onNodeFailed(
        ctx:    AggexEngine.Execution.Context,
        nodeId: Workflow.Node.Id,
        error:  SystemError.Serialized,
    ): void {
        const existing = ctx.session.node_status[nodeId];
        const nodeStatus: Execution.Session.NodeStatus = {
            status:       "failed",
            started_at:   existing?.started_at,
            completed_at: new Date().toISOString(),
            error:        error as any,
        };
        const nodeStatusUpdate = { [nodeId]: nodeStatus };

        ctx.updateSession(d => { Object.assign(d.node_status, nodeStatusUpdate); });

        ctx.emit<Execution.Event.Node.Error>({
            executionId:   ctx.executionId,
            workflowId:    ctx.workflowId,
            type:          "node:error",
            nodeId:        nodeId,
            channel:       this.getEventChannel(ctx),
            error:         error,
            sessionUpdate: {
                node_status: nodeStatusUpdate,
            },
        });
    }
}
