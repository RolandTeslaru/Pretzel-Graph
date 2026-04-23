import { ExecutionSession } from "@pretzel-graph/shared/domain";
import { Workflow } from "@pretzel-graph/shared/domain";
import type { ExecutionSessionSDKImpl, ExecutionSessionSDK } from "./sdk";

export type State = ExecutionSessionSDK.State;

export function _createExecutionSessionReducers_(_sdk: ExecutionSessionSDKImpl) {
    return {
        setNodeStatus: (s, nodeId, update) => {
            if (!s.session.node_status[nodeId]) {
                s.session.node_status[nodeId] = { status: "idle" };
            }
            Object.assign(s.session.node_status[nodeId], update);
        },
        clearNodeStatus: (s, nodeId) => {
            delete s.session.node_status[nodeId];
        },
        clearAllNodeStatuses: (s) => {
            s.session.node_status = {};
        },
        applyUpdate: (s, update) => {
            Object.entries(update).forEach(([key, value]) => {
                if (value)
                    Object.assign(s.session[key as keyof ExecutionSession], value);
            })
        }
    } satisfies _ExecutionSessionReducers;
}

export type _ExecutionSessionReducers = {
    setNodeStatus: (state: State, nodeId: Workflow.Node.Id, update: Partial<ExecutionSession.NodeStatus>) => void;
    clearNodeStatus: (state: State, nodeId: Workflow.Node.Id) => void;
    clearAllNodeStatuses: (state: State) => void;
    applyUpdate: (state: State, update: ExecutionSession.Update) => void
};
