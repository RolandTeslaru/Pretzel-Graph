import { ExecutionSession } from "@vx-agent-editor/shared/domain";
import { Workflow } from "@vx-agent-editor/shared/domain";
import type { ExecutionSessionSDKImpl, ExecutionSessionSDK } from "./sdk";

export type State = ExecutionSessionSDK.State;

function ensureNodeStatus(s: State, nodeId: Workflow.Node.Id): ExecutionSession.NodeStatus {
    if (!s.session.node_status[nodeId]) {
        s.session.node_status[nodeId] = { status: "idle" };
    }
    return s.session.node_status[nodeId];
}

export function _createExecutionSessionReducers_(_sdk: ExecutionSessionSDKImpl) {
    return {
        nodeStarted: (s: State, nodeId: Workflow.Node.Id) => {
            const stat = ensureNodeStatus(s, nodeId);
            stat.status = "running";
            stat.started_at = new Date().toISOString();
        },
        nodeCompleted: (s: State, nodeId: Workflow.Node.Id) => {
            const stat = ensureNodeStatus(s, nodeId);
            stat.status = "completed";
            stat.completed_at = new Date().toISOString();
        },
        nodeWaiting: (s: State, nodeId: Workflow.Node.Id) => {
            const stat = ensureNodeStatus(s, nodeId);
            stat.status = "waiting";
        },
        nodeError: (s: State, nodeId: Workflow.Node.Id, error: string) => {
            const stat = ensureNodeStatus(s, nodeId);
            stat.status = "failed";
            stat.error = error;
            stat.completed_at = new Date().toISOString();
        },
    } satisfies _ExecutionSessionReducers;
}

export type _ExecutionSessionReducers = {
    nodeStarted: (state: State, nodeId: Workflow.Node.Id) => void;
    nodeCompleted: (state: State, nodeId: Workflow.Node.Id) => void;
    nodeWaiting: (state: State, nodeId: Workflow.Node.Id) => void;
    nodeError: (state: State, nodeId: Workflow.Node.Id, error: string) => void;
};
