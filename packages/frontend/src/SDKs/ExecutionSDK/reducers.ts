import { ExecutionSession } from "@vx-agent-editor/shared/domain";
import { Workflow } from "@vx-agent-editor/shared/domain";
import type { ExecutionSessionSDK } from "../ExecutionSessionSDK/sdk";
import type { ExecutionSDK, ExecutionSDKImpl, ExecutionSDKImplImpl } from "./sdk";

export type State = ExecutionSDK.State;

export function _createExecutionReducers_(_sdk: ExecutionSDKImpl) {
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
