import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Chat, Orchestrator, Execution, Workflow } from "@vx-agent-editor/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { OrchestratorSDK } from "../OrchestratorSDK/sdk";
import { RealtimeSDK } from "../Realtime/sdk";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import { toast } from "sonner";

@SDK("Chat")
export class ChatSDKImpl extends BaseSDK<ChatSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ChatSDK.State> = create(
        immer<ChatSDK.State>(() => ({
            messages: [],
            currentChat: null,
            messagesRecord: {},
            isLoading: false,
            isSidebarVisible: false,
            otherChats: {}
        }))
    )

    public readonly reducers: ChatSDK.Reducers = {
        message: {
        }
    }

    public readonly actions: ChatSDK.Actions = {
        message: {
            send: async ({ content, attachments }) => {

                const workflow_id = WorkbenchSDK.state.workflow.id

                let currentChat = this.state.currentChat;

                if(!currentChat){
                    try {
                        const { chat } = await Chat.API.create(api, { workflow_id })
                        
                        currentChat = chat;
    
                        this.useStore.setState(s => {
                            s.currentChat = chat;
                        })
                    }
                    catch (err) {
                        toast.error("Failed to create chat");
                        console.error("Failed to create chat", err);
                        return;
                    }
                }

                const message: Chat.Message.User = {
                    content: content,
                    id: Chat.Message.createId(),
                    chat_id: currentChat.id,
                    role: "user",
                    attachments,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }

                try { 
                    const { responseMessage } = await Chat.API.Message.send(api, {
                        message,
                    })
                    
                    this.setState(s => {
                        s.messages.push(message.id);
                        s.messagesRecord[message.id] = message;
                    })
    
                    OrchestratorSDK.setState(s => {
                        s.executionContext.messages.push(message);
                    })
                    // Must be placed after the state update, as it relies on the message being in the state to update it with the response
                    const jobId = await OrchestratorSDK.actions.execution.run()
    
                    if(!jobId)
                        throw new Error("No job id returned");
    
                    this.setState(s => {
                        const msg = s.messagesRecord[message.id];
                        msg.job_id = jobId;
    
                        s.messagesRecord[responseMessage.id] = responseMessage;
                        s.messages.push(responseMessage.id);
                    })
    
    
                    const topic = Orchestrator.Event.getTopic(jobId);
    
                    const unsubscribe = RealtimeSDK.subscribeToTopic<Orchestrator.Event>(
                        topic, 
                        (event) => {
                            if (
                                event.type === "node_messages:chunk" && 
                                event.isChatOutput &&
                                event.nodeId
                            ) {
                                this.setState(s => {
                                    s.messagesRecord[responseMessage.id].content += event.chunk;
                                });
                            }
                            else if (event.type === "completed" || event.type === "failed") {
                                this.setState(s => {
                                    const msg = s.messagesRecord[responseMessage.id] as Chat.Message.Assistant;
                                    msg.data.isProcessing = false;
                                });
                                unsubscribe();
                            }
                        }
                    )
                }
                catch (err) {
                    toast.error("Failed to send message");
                    console.error("Failed to send message", err);
                    return;
                }
            }
        },
        chat: {
            load: async (chatId: Chat.Id) => {
                this.useStore.setState(s => {
                    s.messagesRecord = {};
                    s.messages = [];
                    s.isLoading = true;
                })

                const { chat, messages } = await Chat.API.get(api, { chatId });

                this.useStore.setState(s => {
                    
                    s.currentChat = chat;
                    messages.forEach(m => {
                        s.messages.push(m.id);
                        s.messagesRecord[m.id] = m;
                    })
        
                    s.isLoading = false;
                })
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
        currentChat: Chat | null,
        messagesRecord: Record<Chat.Message.Id, Chat.Message>,
        isLoading: boolean,
        isSidebarVisible: boolean
        otherChats: Record<Chat.Id, Chat>
    }

    export type Reducers = {
    }

    export type Actions = {
        message: {
            send: (props: {
                content: string,
                chatId?: Chat.Id,
                workflow: Workflow,
                attachments?: Chat.Attachment,
                executionContext: Execution.Context
            }) => Promise<void>
        },
        clearMessages: () => Promise<void>,
        setSidebarVisiblity: (show: boolean) => void,
        chat: {
            load: (chatId: Chat.Id) => Promise<void>
        }
    }

    export type Selectors = {}

}
