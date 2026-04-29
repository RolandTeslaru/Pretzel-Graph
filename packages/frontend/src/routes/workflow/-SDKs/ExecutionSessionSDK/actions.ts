import { ExecutionSession, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { type ExecutionSessionSDKImpl } from "./sdk"
import { toast } from "sonner";
import type { DropFirstArg } from "@/SDKs/types";
import { ChatSDK } from "../ChatSDK/sdk";

export const createExecutionSessionSDKActions = (sdk: ExecutionSessionSDKImpl) => {
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
        setSession: async (id) => {
            try {
                console.log("FETCHIN G SESSION WITH ID ", id)
                const response = await ExecutionSession.API.get(api, { id });
                console.log("SET SESSION RESPONSE ", response,)
                sdk.setState(s => {
                    s.session = response.session;
                });
                return response.session;
            } catch (error) {
                toast.error("Failed to load execution session");
                throw error;
            }
        },
        meta: {
            list: async (workflowId) => {
                try {
                    const response = await ExecutionSession.API.Meta.list(api, { workflowId });
                    console.log("Fetched session metas:", response.sessionMetas);
                    sdk.setState(s => {
                        for (const meta of response.sessionMetas) {
                            s.sessionMetas[meta.id] = meta;
                        }
                    });
                    return response.sessionMetas;
                } catch (error) {
                    toast.error("Failed to load execution session history");
                    throw error;
                }
            },
            get: async (id) => {
                try {
                    const response = await ExecutionSession.API.Meta.get(api, { id });
                    sdk.setState(s => {
                        s.sessionMetas[response.sessionMeta.id] = response.sessionMeta;
                    });
                    return response.sessionMeta;
                } catch (error) {
                    toast.error("Failed to load execution session");
                    throw error;
                }
            },
        },
    } satisfies ExecutionSessionSDKActions
}

export type ExecutionSessionSDKActions = {
    create: (workflowId: Workflow.Id) => Promise<ExecutionSession>,
    get: (id: ExecutionSession.Id) => Promise<ExecutionSession>,
    update: (id: ExecutionSession.Id, session: ExecutionSession.Update) => Promise<ExecutionSession>,
    loadLocal: (session: ExecutionSession) => void,
    setNodeStatus: DropFirstArg<ExecutionSessionSDKImpl["reducers"]["setNodeStatus"]>,
    clearNodeStatus: DropFirstArg<ExecutionSessionSDKImpl["reducers"]["clearNodeStatus"]>,
    clearStatus: () => void,
    clearAllNodeStatuses: () => void,
    prepareForRun: () => void,
    setSession: (id: ExecutionSession.Id) => Promise<ExecutionSession>,
    meta: {
        list: (workflowId: Workflow.Id) => Promise<ExecutionSession.Meta[]>,
        get: (id: ExecutionSession.Id) => Promise<ExecutionSession.Meta>,
    },
}
