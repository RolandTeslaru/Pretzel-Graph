import { Execution } from "@pretzel-graph/shared/domain";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import type { SubWorkflowNormalizer } from "src/compiler/normalizers/subworkflow";

type NodeStatus = Execution.Session.NodeStatus;

export class NodeStatusManager {
    private readonly childNodeIdsByParentNodeId = new Map<Workflow.Node.Id, Set<Workflow.Node.Id>>();

    constructor(
        private readonly inlineNodeMetaMap: SubWorkflowNormalizer.InlineNodeMetaMap,
    ) {
        for (const [nodeId, meta] of Object.entries(inlineNodeMetaMap) as [Workflow.Node.Id, SubWorkflowNormalizer.InlineNodeMeta][]) {
            const children = this.childNodeIdsByParentNodeId.get(meta.parentNodeId) ?? new Set<Workflow.Node.Id>();
            children.add(nodeId);
            this.childNodeIdsByParentNodeId.set(meta.parentNodeId, children);
        }
    }

    handleStatusSet(
        session: Execution.Session,
        nodeId: Workflow.Node.Id,
        nodeStatus: NodeStatus,
    ): Execution.Session["node_status"] {
        const updates: Execution.Session["node_status"] = {
            [nodeId]: nodeStatus,
        };

        this.addParentStatusUpdates(session, updates, nodeId);
        return updates;
    }

    private addParentStatusUpdates(
        session: Execution.Session,
        updates: Execution.Session["node_status"],
        nodeId: Workflow.Node.Id,
    ): void {
        const inlineMeta = this.inlineNodeMetaMap[nodeId];
        if (!inlineMeta)
            return;

        const parentNodeId = inlineMeta.parentNodeId;
        const parentStatus = this.deriveParentStatus(session, updates, parentNodeId);

        if (!parentStatus)
            return;

        updates[parentNodeId] = parentStatus;
        this.addParentStatusUpdates(session, updates, parentNodeId);
    }

    private deriveParentStatus(
        session: Execution.Session,
        updates: Execution.Session["node_status"],
        parentNodeId: Workflow.Node.Id,
    ): NodeStatus | undefined {
        const childNodeIds = this.childNodeIdsByParentNodeId.get(parentNodeId);
        if (!childNodeIds)
            return;

        const existing = updates[parentNodeId] ?? session.node_status[parentNodeId];
        const childStatuses = [...childNodeIds]
            .map(childNodeId => updates[childNodeId] ?? session.node_status[childNodeId])
            .filter((status): status is NodeStatus => status !== undefined);

        const now = new Date().toISOString();
        const hasFailedChild = childStatuses.some(status => status.status === "failed");
        if (hasFailedChild || existing?.status === "failed") {
            const failedChild = childStatuses.find(status => status.status === "failed");
            return {
                status:       "failed",
                started_at:   existing?.started_at ?? now,
                completed_at: existing?.completed_at ?? now,
                error:        existing?.error ?? failedChild?.error,
            };
        }

        const hasActiveChild = childStatuses.some(status => status.status === "running" || status.status === "waiting");
        if (hasActiveChild) {
            return {
                status:     "running",
                started_at: existing?.started_at ?? now,
            };
        }

        if (existing?.status === "running" || existing?.status === "waiting") {
            return {
                status:       "completed",
                started_at:   existing.started_at,
                completed_at: now,
            };
        }
    }
}
