import type { Execution, Foundations, Recording, Workflow } from "@pretzel-graph/shared/domain"
import type { ExecutionSDK } from "./sdk"

export const executionSDKSelectors = {
    getNodeStatus: (s, nodeId) => {
        return s.currentExecution?.session.node_status?.[nodeId] ?? { status: "idle" }
    },
    getEdgeStatus: (s, edgeId) => {
        return s.currentExecution?.session.edge_state?.[edgeId] ?? { status: "idle", runCount: 0 }
    },
    getEdgeItemCount: (s, sourceNodeId, sourcePortId) => {
        const projection = s.currentExecution?.session.node_output_projections[sourceNodeId]?.[sourcePortId]
        return Array.isArray(projection) ? projection.length : undefined
    },
    getOrderedTracks: (s) => {
        const rec = s.recordingViewer.currentRecording;
        if (!rec) return [];
        return Object.values(rec.tracks)
            .filter(t => t.unitIds.length > 0)
            .sort((a, b) => {
                const aStart = rec.units[a.unitIds[0]]?.startedAt ?? 0;
                const bStart = rec.units[b.unitIds[0]]?.startedAt ?? 0;
                return aStart - bStart;
            });
    },
    getTotalDuration: (s) => {
        const rec = s.recordingViewer.currentRecording;
        if (!rec) return 0;
        const units = Object.values(rec.units);
        if (units.length === 0) return 0;
        return Math.max(...units.map(u => u.startedAt + (u.duration ?? 0)));
    },
} satisfies ExecutionSDKSelectors

export interface ExecutionSDKSelectors {
    getNodeStatus:    (state: ExecutionSDK.State, nodeId: Workflow.Node.Id) => Execution.Session.NodeStatus
    getEdgeStatus:    (state: ExecutionSDK.State, edgeId: Workflow.Edge.Id) => Execution.Session.EdgeState
    getEdgeItemCount: (state: ExecutionSDK.State, sourceNodeId: Workflow.Node.Id, sourcePortId: Foundations.Port.Output.Id) => number | undefined
    getOrderedTracks: (state: ExecutionSDK.State) => Recording.Track[]
    getTotalDuration: (state: ExecutionSDK.State) => number
}