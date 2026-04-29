import { ExecutionSession } from "@pretzel-graph/shared/domain";
import { Workflow } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";

export type State = ExecutionSDK.State;

export function _createExecutionReducers_(_sdk: ExecutionSDKImpl) {
    return {
        setNodeStatus: (s, nodeId, update) => {
            if (!s.session.node_status[nodeId]) {
                s.session.node_status[nodeId] = { status: "idle" };
            }
            Object.assign(s.session.node_status[nodeId], update);
        },
        applyUpdate: (s, update) => {
            Object.entries(update).forEach(([key, value]) => {
                if (value)
                    // @ts-expect-error
                    Object.assign(s.session[key as keyof ExecutionSession], value);
            })
        }
    } satisfies _ExecutionSessionReducers;
}

export type _ExecutionSessionReducers = {
    setNodeStatus: (state: State, nodeId: Workflow.Node.Id, update: Partial<ExecutionSession.NodeStatus>) => void;
    applyUpdate: (state: State, update: ExecutionSession.Update) => void
};
