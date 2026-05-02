import type { Execution, Foundations, Workflow } from "@pretzel-graph/shared/domain"
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
} satisfies ExecutionSDKSelectors

export interface ExecutionSDKSelectors {
    getNodeStatus:    (state: ExecutionSDK.State, nodeId: Workflow.Node.Id) => Execution.Session.NodeStatus
    getEdgeStatus:    (state: ExecutionSDK.State, edgeId: Workflow.Edge.Id) => Execution.Session.EdgeState
    getEdgeItemCount: (state: ExecutionSDK.State, sourceNodeId: Workflow.Node.Id, sourcePortId: Foundations.Port.Output.Id) => number | undefined
}