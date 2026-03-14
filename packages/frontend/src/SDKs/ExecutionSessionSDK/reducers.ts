import { ExecutionSession } from "@vx-agent-editor/shared/domain";
import { Workflow } from "@vx-agent-editor/shared/domain";
import type { ExecutionSessionSDKImpl, ExecutionSessionSDK } from "./sdk";

export type State = ExecutionSessionSDK.State;

export function _createExecutionSessionReducers_(_sdk: ExecutionSessionSDKImpl) {
    return {
        setNodeStatus: (s: State, nodeId: Workflow.Node.Id, update: Partial<ExecutionSession.NodeStatus>) => {
            if (!s.session.node_status[nodeId]) {
                s.session.node_status[nodeId] = { status: "idle" };
            }
            Object.assign(s.session.node_status[nodeId], update);
        },
        clearNodeStatus: (s: State, nodeId: Workflow.Node.Id) => {
            delete s.session.node_status[nodeId];
        },
        clearAllNodeStatuses: (s: State) => {
            s.session.node_status = {};
        },
    } satisfies _ExecutionSessionReducers;
}

export type _ExecutionSessionReducers = {
    setNodeStatus: (state: State, nodeId: Workflow.Node.Id, update: Partial<ExecutionSession.NodeStatus>) => void;
    clearNodeStatus: (state: State, nodeId: Workflow.Node.Id) => void;
    clearAllNodeStatuses: (state: State) => void;
};
