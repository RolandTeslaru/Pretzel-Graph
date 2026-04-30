import type { Execution, Workflow } from "@pretzel-graph/shared/domain"
import type { ExecutionSDK } from "./sdk"

export const executionSDKSelectors = {
    getNodeStatus: (s, nodeId) => {
        return s.currentExecution?.session.node_status?.[nodeId] ?? { status: "idle" }
    }
} satisfies ExecutionSDKSelectors

export interface ExecutionSDKSelectors {
    getNodeStatus: (state: ExecutionSDK.State, nodeId: Workflow.Node.Id) => Execution.Session.NodeStatus

}