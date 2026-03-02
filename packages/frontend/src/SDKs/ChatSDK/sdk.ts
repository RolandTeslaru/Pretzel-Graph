import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Chat, Orchestrator, RuntimeSnapshot, Workflow } from "@vx-agent-editor/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { supabase } from "@/libs/supabase";
import { OrchestratorSDK } from "../OrchestratorSDK/sdk";
import { RealtimeSDK } from "../Realtime/sdk";

@SDK("Chat")
export class ChatSDKImpl extends BaseSDK<ChatSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ChatSDK.State> = create(
        immer<ChatSDK.State>(() => ({
            messages: [],
            chatId: null,
            messagesRecord: {},
            isLoading: false,
            isSidebarVisible: false,
        }))
    )

    public readonly reducers: ChatSDK.Reducers = {
        message: {
        }
    }

    public readonly actions: ChatSDK.Actions = {
        message: {
            send: async ({ content, chatId, attachments, workflow }) => {

                if(!chatId){
                    const data = await Chat.API.create(api, {})
                    chatId = data.chatId;
                    if(!chatId)
                        throw new Error("No chat id returned");
                    
                    this.useStore.setState(s => {
                        s.chatId = chatId as Chat.Id;
                    })
                }

                const message: Chat.Message.User = {
                    content: content,
                    id: Chat.Message.createId(chatId, "user"),
                    chat_id: chatId,
                    role: "user",
                    attachments,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }

                this.useStore.setState(s => {
                    s.messages.push(message.id);
                    s.messagesRecord[message.id] = message;
                })

                OrchestratorSDK.useStore.setState(s => {
                    s.runtimeSnapshot.messages.push(message);
                })

                const snapshot = OrchestratorSDK.state.runtimeSnapshot;

                const { jobId, responseMessage } = await Chat.API.Message.send(api, {
                    message,
                    workflow,
                    snapshot
                })

                this.useStore.setState(s => {
                    const msg = s.messagesRecord[message.id];
                    msg.job_id = jobId;

                    s.messagesRecord[responseMessage.id] = responseMessage;
                    s.messages.push(responseMessage.id);
                })


                const topic = Orchestrator.Event.getTopic(jobId);

                const unsubscribe = RealtimeSDK.subscribeToTopic(
                    topic, 
                    (payload) => {
                        const event = JSON.parse(payload.data) as Orchestrator.Event;
                        console.log("Received event for topic ", topic, event);
                        if (
                            event.type === "node_messages:chunk" && 
                            event.isChatOutput &&
                            event.nodeId
                        ) {
                            this.useStore.setState(s => {
                                s.messagesRecord[responseMessage.id].content += event.chunk;
                            });
                        }
                        else if (event.type === "completed" || event.type === "failed") {
                            this.useStore.setState(s => {
                                const msg = s.messagesRecord[responseMessage.id] as Chat.Message.Assistant;
                                msg.isProcessing = false;
                            });
                            unsubscribe();
                        }
                    }
                )
            }
        },
        clearMessages: async () => {
            this.setState(s => {
                s.messages = [];
                s.messagesRecord = {};
            })
        },
        setSidebarVisiblity: (show: boolean) => {
            this.setState(s => {
                s.isSidebarVisible = show;
            })
        },
    }

    public readonly selectors: ChatSDK.Selectors = {

    }

}

export const ChatSDK = SDK.get<ChatSDKImpl>("Chat")

export namespace ChatSDK {
    export type State = {
        messages: Chat.Message.Id[],
        chatId: Chat.Id | null,
        messagesRecord: Record<Chat.Message.Id, Chat.Message>,
        isLoading: boolean,
        isSidebarVisible: boolean
    }

    export type Reducers = {
        message: {

        }
    }

    export type Actions = {
        message: {
            send: (props: {
                content: string,
                chatId?: Chat.Id,
                workflow: Workflow,
                attachments?: Chat.Attachment,
                snapshot: RuntimeSnapshot
            }) => Promise<void>
        },
        clearMessages: () => Promise<void>,
        setSidebarVisiblity: (show: boolean) => void,
    }

    export type Selectors = {}

}
