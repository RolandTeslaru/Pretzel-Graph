import { Chat } from "@vx-agent-editor/shared/domain";
import { OrchestratorSDK } from "../OrchestratorSDK/sdk";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import type { ChatSDKImpl } from "./sdk";
import { toast } from "sonner";
import { api } from "../ApiInterceptorSDK";
import { DialogSDK } from "@/SDKs/DialogSDK";
import FullscreenChat from "./ui/FullscreenChat";
import { ExecutionSessionSDK } from "../ExecutionSessionSDK/sdk";
import { HumanMessage } from "@langchain/core/messages";

function deriveChatName(content: string, maxLength = 50): string {
    const trimmed = content.trim().replace(/\s+/g, ' ');
    return trimmed.length > maxLength
        ? trimmed.slice(0, maxLength).trimEnd() + '…'
        : trimmed;
}

export function createChatSDKActions(sdk: ChatSDKImpl) {
    return {
        message: {
            upsert: (message) => {
                sdk.setState(s => sdk.reducers.upsertMessage(s, message))
            },
            appendContent: (messageId, content) => {
                sdk.setState(s => sdk.reducers.appendContent(s, messageId, content))
            },
            setContent: (messageId, content) => {
                sdk.setState(s => {
                    s.messagesRecord[messageId].content = content;
                })
            },
            finaliseStreaming: (messageId) => {
                sdk.setState(s => {
                    const msg = s.messagesRecord[messageId] as Chat.Message.AI;
                    msg.data.isProcessing = false;
                })
            },
            send: async ({ content, attachments }) => {

                const workflow_id = WorkbenchSDK.state.workflow.id

                let currentChatId = sdk.state.currentChatId;
                let currentChat = currentChatId ? sdk.state.chats[currentChatId] : null;

                const execution_session = ExecutionSessionSDK.state.session;

                // Ensures we have a chat
                if (!currentChat) {
                    try {
                        const { chat } = await Chat.API.create(api, { workflow_id, name: deriveChatName(content), execution_session })

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

                const message: Chat.Message.Human = {
                    content: content,
                    id: Chat.Message.createId(),
                    chat_id: currentChat.id,
                    role: "human",
                    attachments,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }

                try {
                    await Chat.API.Message.send(api, { message })

                    sdk.actions.message.upsert(message)

                    ExecutionSessionSDK.setState(s => {
                        s.session.messages.push(new HumanMessage(message.content))
                        s.session.chatId = currentChatId!;
                    })
                    const jobId = await OrchestratorSDK.actions.run()

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
        },

        chat: {
            getAll: async () => {
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
            load: async (chatId: Chat.Id) => {
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

                // ExecutionSessionSDK.setState(s => {
                //     s.session.messages = [];

                //     messages.forEach(msg => {
                //         s.session.messages.push(msg)
                //     })
                // })
            },
            new: () => {
                sdk.setState(s => {
                    s.currentChatId = null;
                    s.messages = [];
                    s.messagesRecord = {};
                });
                ExecutionSessionSDK.setState(s => {
                    s.session.messages = [];
                });
            },
            clearMessages: async () => {
                sdk.setState(s => {
                    s.messages = [];
                    s.messagesRecord = {};
                })
            },
            erase: async (chatId: Chat.Id) => {
                try {
                    await Chat.API.erase(api, { chatId });

                    sdk.setState(s => {
                        delete s.chats[chatId];
                        if (s.currentChatId === chatId) {
                            s.currentChatId = Chat.createId();
                            s.messages = [];
                            s.messagesRecord = {};
                        }
                    });
                } catch (err) {
                    toast.error("Failed to delete chat");
                    console.error("Failed to delete chat", err);
                }
            },
        },

        ui: {
            setSidebarVisibility: (show: boolean) => {
                sdk.setState(s => {
                    s.isSidebarVisible = show;
                })
            },
            openFullscreen: () => {
                DialogSDK.actions.push("fullscreen-chat", (props) => (
                    <DialogSDK.Template className="border-none! shadow-none! bg-white/0!" {...props}>
                        <FullscreenChat />
                    </DialogSDK.Template>
                ))

                setTimeout(() => {
                    sdk.actions.ui.setSidebarVisibility(false);
                }, 500)
            },
        },
    } satisfies ChatSDKActions
}

export interface ChatSDKActions {
    message: {
        upsert: (message: Chat.Message) => void
        appendContent: (messageId: Chat.Message.Id, content: string) => void
        setContent: (messageId: Chat.Message.Id, content: string) => void
        finaliseStreaming: (messageId: Chat.Message.Id) => void
        send: (props: {
            content: string,
            attachments?: Chat.Attachment,
        }) => Promise<void>
    }
    chat: {
        getAll: () => Promise<boolean>
        load: (chatId: Chat.Id) => Promise<void>
        new: () => void
        clearMessages: () => Promise<void>
        erase: (chatId: Chat.Id) => Promise<void>
    }
    ui: {
        setSidebarVisibility: (show: boolean) => void
        openFullscreen: () => void
    }
}
