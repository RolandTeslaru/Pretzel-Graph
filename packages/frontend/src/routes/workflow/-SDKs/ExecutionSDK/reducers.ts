import { Execution, Workflow } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";

export type State = ExecutionSDK.State;

export function _createExecutionReducers_(_sdk: ExecutionSDKImpl) {
    return {
        setNodeStatus: (s, nodeId, update) => {
            const session = s.currentExecution?.session;
            if (!session) return;

            if (!session.node_status[nodeId]) {
                session.node_status[nodeId] = { status: "idle" };
            }
            Object.assign(session.node_status[nodeId], update);
        },
        applyUpdate: (s, update) => {
            Object.entries(update).forEach(([key, value]) => {
                const session = s.currentExecution?.session;
                if (!session || !value) return;

                Object.assign(session[key as keyof Execution.Session], value);
            })
        }
    } satisfies _ExecutionSessionReducers;
}

export interface _ExecutionSessionReducers {
    setNodeStatus: (state: State, nodeId: Workflow.Node.Id, update: Partial<Execution.Session.NodeStatus>) => void;
    applyUpdate:   (state: State, update: Execution.Session.Update) => void
};
