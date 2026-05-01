import { Execution, Workflow } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";

export type State = ExecutionSDK.State;

export function _createExecutionReducers_(_sdk: ExecutionSDKImpl) {
    return {
        setNodeStatus: (s, nodeId, update) => {
            const session = s.currentExecution?.session;
            if (!session) return;

            if (!session.node_status[nodeId])
                session.node_status[nodeId] = { status: "idle" };
            Object.assign(session.node_status[nodeId], update);
        },
        applySessionUpdate: (s, update) => {
            if(!update) return;
            const session = s.currentExecution?.session;
            if (!session) 
                return;

            Object.entries(update).forEach(([key, value]) => {
                if(!value) return;
                Object.assign(session[key as keyof Execution.Session], value);
            })
        },
        setSession: (s, session) => {
            if (!s.currentExecution) return;
            s.currentExecution.session = session;
        },
        setStatus: (s, status) => {
            if (!s.currentExecution) return;
            s.currentExecution.status = status;
        },
        setError: (s, error) => {
            if (!s.currentExecution) return;
            s.currentExecution.error = error;
        },
        setNodeOutput: (s, nodeId, output) => {
            const session = s.currentExecution?.session;
            if (!session) return;

            session.node_output_projections[nodeId] = output;
        }
    } satisfies _ExecutionSessionReducers;
}

export interface _ExecutionSessionReducers {
    setSession:         (state: State, session: Execution.Session) => void;
    setNodeStatus:      (state: State, nodeId: Workflow.Node.Id, update: Partial<Execution.Session.NodeStatus>) => void;
    applySessionUpdate: (state: State, update?: Execution.Session.Update) => void
    setStatus:          (state: State, status: Execution.Status) => void;
    setError:           (state: State, error: any) => void;
    setNodeOutput:      (state: State, nodeId: Workflow.Node.Id, output: any) => void;
};
