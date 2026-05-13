import { Execution } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";

export type State = ExecutionSDK.State;

export function _createExecutionReducers_(_sdk: ExecutionSDKImpl) {
    return {
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
        setCurrentExecution: (s, execution) => {
            s.currentExecution = execution;
        },
    } satisfies _ExecutionSessionReducers;
}

export interface _ExecutionSessionReducers {
    setSession:          (state: State, session: Execution.Session) => void;
    applySessionUpdate:  (state: State, update?: Execution.Session.Update) => void
    setStatus:           (state: State, status: Execution.Status) => void;
    setError:            (state: State, error: any) => void;
    setCurrentExecution: (state: State, execution: Execution) => void;
};
