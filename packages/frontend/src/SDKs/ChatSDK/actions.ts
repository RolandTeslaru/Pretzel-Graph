import { Chat, Execution, Orchestrator, Workflow } from "@vx-agent-editor/shared/domain";
import { OrchestratorSDK } from "../OrchestratorSDK/sdk";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import type { ChatSDK, ChatSDKImpl } from "./sdk";
import { RealtimeSDK } from "../Realtime/sdk";
import { toast } from "sonner";
import { api } from "../ApiInterceptorSDK";

export function createChatSDKActions(sdk: ChatSDKImpl) {
    return {
        upsertMessage: (message) => {
            sdk.setState(s => sdk.reducers.upsertMessage(s, message))
        },
        appendContent: (messageId, content) => {
            sdk.setState(s => sdk.reducers.appendContent(s, messageId, content))
        },
        finaliseStreaming: (messageId) => {
            sdk.setState(s => {
                const msg = s.messagesRecord[messageId] as Chat.Message.Assistant;
                msg.data.isProcessing = false;
            })
        },
        getAllChats: async () => {
            try {
                const { chats } = await Chat.API.list(api, {});
                sdk.setState(s => {
                    chats.forEach(chat => {
                        if (!s.chats[chat.id]) {
                            s.chats[chat.id] = chat;
                        }
                    })
                })
                return true;
            } catch (err) {
                toast.error("Failed to get chats");
                console.error("Failed to get chats", err);
                return false;
            }
        },
        sendMessage: async ({ content, attachments }) => {

            const workflow_id = WorkbenchSDK.state.workflow.id

            let currentChatId = sdk.state.currentChatId;
            let currentChat = currentChatId ? sdk.state.chats[currentChatId] : null;

            // Ensures we have a chat
            if (!currentChat) {
                try {
                    const { chat } = await Chat.API.create(api, { workflow_id })

                    currentChat = chat;
                    currentChatId = chat.id;

                    sdk.setState(s => {
                        s.currentChatId = chat.id;
                        s.chats[chat.id] = chat;
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
                await Chat.API.Message.send(api, { message })

                sdk.actions.upsertMessage(message)

                OrchestratorSDK.setState(s => {
                    s.executionContext.messages.push(message);
                    s.executionContext.chatId = currentChatId!;
                })
                const jobId = await OrchestratorSDK.actions.execution.run()

                if (!jobId)
                    throw new Error("No job id returned");

                sdk.setState(s => {
                    sdk.reducers.resolveJobId(s, message.id, jobId)
                })
            }
            catch (err) {
                toast.error("Failed to send message");
                console.error("Failed to send message", err);
                return;
            }
        },
        loadChat: async (chatId: Chat.Id) => {


            sdk.useStore.setState(s => {
                s.messages = [];
                s.messagesRecord = {};
                s.currentChatId = chatId;
                s.isLoading = true;
            })

            const { chat, messages } = await Chat.API.get(api, { chatId });

            sdk.useStore.setState(s => {
                s.currentChatId = chatId;
                messages.forEach(m => {
                    s.messages.push(m.id);
                    s.messagesRecord[m.id] = m;
                })
                s.isLoading = false;
            })

            OrchestratorSDK.setState(s => {
                s.executionContext.messages = messages;
            })
        },
        newChat: () => {
            sdk.setState(s => {
                s.currentChatId = null;
                s.messages = [];
                s.messagesRecord = {};
            });
            OrchestratorSDK.setState(s => {
                s.executionContext.messages = [];
            });
        },
        clearMessages: async () => {
            sdk.setState(s => {
                s.messages = [];
                s.messagesRecord = {};
            })
        },
        setSidebarVisiblity: (show: boolean) => {
            sdk.setState(s => {
                s.isSidebarVisible = show;
            })
        },
    } satisfies ChatSDKActions
}

export interface ChatSDKActions {
    upsertMessage: (message: Chat.Message) => void
    appendContent: (messageId: Chat.Message.Id, content: string) => void
    finaliseStreaming: (messageId: Chat.Message.Id) => void
    sendMessage: (props: {
        content: string,
        attachments?: Chat.Attachment,
    }) => Promise<void>
    getAllChats: () => Promise<boolean>,
    newChat: () => void,
    clearMessages: () => Promise<void>,
    setSidebarVisiblity: (show: boolean) => void,
    loadChat: (chatId: Chat.Id) => Promise<void>,
}
