import { ExecutionSession, Workflow } from "@vx-agent-editor/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { type ExecutionSDKImpl } from "./sdk"
import { toast } from "sonner";
import type { DropFirstArg } from "../types";
import { ChatSDK } from "../ChatSDK/sdk";

export const createExecutionSDKActions = (sdk: ExecutionSDKImpl) => {
    return {
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
        clearStatus: () => sdk.setState(s => {
            s.session.node_status = {};
            s.session.edge_state = {};
        }),
        prepareForRun: () => sdk.setState(s => {
            s.session.node_output_projections = {}
            s.session.node_status = {}
            s.session.edge_state = {}
            s.session.chatId = ChatSDK.state.currentChatId;
        }),
        setNodeStatus: (...args) => sdk.setState(s => sdk.reducers.setNodeStatus(s, ...args)),
        clearNodeStatus: (...args) => sdk.setState(s => sdk.reducers.clearNodeStatus(s, ...args)),
        clearAllNodeStatuses: () => sdk.setState(s => sdk.reducers.clearAllNodeStatuses(s)),
    } satisfies ExecutionSDKActions
}

export type ExecutionSDKActions = {
    create: (workflowId: Workflow.Id) => Promise<ExecutionSession>,
    get: (id: ExecutionSession.Id) => Promise<ExecutionSession>,
    update: (id: ExecutionSession.Id, session: ExecutionSession.Update) => Promise<ExecutionSession>,
    loadLocal: (session: ExecutionSession) => void,
    setNodeStatus: DropFirstArg<ExecutionSDKImpl["reducers"]["setNodeStatus"]>,
    clearNodeStatus: DropFirstArg<ExecutionSDKImpl["reducers"]["clearNodeStatus"]>,
    clearStatus: () => void,
    clearAllNodeStatuses: () => void,
    prepareForRun: () => void
}
