import { ExecutionSession, Workflow } from "@vx-agent-editor/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { type ExecutionSessionSDKImpl } from "./sdk"
import { toast } from "sonner";
import type { DropFirstArg } from "../types";

export const createExecutionSessionSDKActions = (sdk: ExecutionSessionSDKImpl) => {
    return {
        session: {
            create: async (workflowId) => {
                try {
                    const response = await ExecutionSession.API.create(api, {
                        workflowId,
                        session: sdk.state.session
                    });

                    sdk.setState(s => {
                        s.session = response.session;
                    });
                    return response.session;
                } catch (error) {
                    toast.error("Failed to create execution session");
                    throw error;
                }
            },
            get: async (id) => {
                try {
                    const response = await ExecutionSession.API.get(api, { id });
                    sdk.setState(s => {
                        s.session = response.session;
                    });
                    return response.session;
                } catch (error) {
                    toast.error("Failed to retrieve execution session");
                    throw error;
                }
            },
            update: async (id, sessionUpdates) => {
                try {
                    const response = await ExecutionSession.API.update(api, {
                        id,
                        session: sessionUpdates
                    });
                    sdk.setState(s => {
                        s.session = response.session;
                    });
                    return response.session;
                } catch (error) {
                    toast.error("Failed to update execution session");
                    throw error;
                }
            },
            loadLocal: (session: ExecutionSession) => {
                sdk.setState(s => {
                    s.session = session;
                });
            },
            setNodeStatus: (...args) => sdk.setState(s => sdk.reducers.setNodeStatus(s, ...args)),
            clearNodeStatus: (...args) => sdk.setState(s => sdk.reducers.clearNodeStatus(s, ...args)),
            clearAllNodeStatuses: () => sdk.setState(s => sdk.reducers.clearAllNodeStatuses(s)),
        }
    } satisfies ExecutionSessionSDKActions
}

export type ExecutionSessionSDKActions = {
    session: {
        create: (workflowId: Workflow.Id) => Promise<ExecutionSession>,
        get: (id: ExecutionSession.Id) => Promise<ExecutionSession>,
        update: (id: ExecutionSession.Id, session: ExecutionSession.Update) => Promise<ExecutionSession>,
        loadLocal: (session: ExecutionSession) => void,
        setNodeStatus: DropFirstArg<ExecutionSessionSDKImpl["reducers"]["setNodeStatus"]>,
        clearNodeStatus: DropFirstArg<ExecutionSessionSDKImpl["reducers"]["clearNodeStatus"]>,
        clearAllNodeStatuses: () => void,
    }
}
