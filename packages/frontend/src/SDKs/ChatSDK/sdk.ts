import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Chat, RuntimeSnapshot, Workflow } from "@vx-agent-editor/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { supabase } from "@/libs/supabase";

@SDK("Chat")
export class ChatSDKImpl extends BaseSDK<ChatSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ChatSDK.State> = create(
        immer<ChatSDK.State>(() => ({
            messages: [],
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
            send: async ({ content, chatId, attachments, workflow, snapshot }) => {
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

                const { jobId } = await Chat.API.Message.send(api, {
                    message,
                    workflow,
                    snapshot
                })

                const response = await Chat.API.Message.streamOutput(supabase, {
                    chatId,
                    jobId
                })
                
                if (!response.body) 
                    throw new Error("No response body returned");

                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");

                let responseMessageId: Chat.Message.Id | undefined = undefined;

                while (true) {
                    const { done, value } = await reader.read();

                    if (done)
                        break;

                    const textChunk = decoder.decode(value, { stream: true });

                    const lines = textChunk.split('\n').filter(Boolean);

                    for (const line of lines) {
                        const event = JSON.parse(line);

                        if (event.type === "response:created") {
                            try {
                                const parsedEvent = Chat.Event.ResponseMessageCreated.Schema.parse(event);
                                responseMessageId = parsedEvent.responseMessageId;

                                this.useStore.setState(s => {
                                    if (!s.messages.includes(responseMessageId!))
                                        s.messages.push(responseMessageId!);

                                    s.messagesRecord[responseMessageId!] = {
                                        id: responseMessageId!,
                                        chat_id: chatId,
                                        role: "assistant",
                                        content: "",
                                        created_at: new Date().toISOString(),
                                        updated_at: new Date().toISOString(),
                                        attachments: {},
                                        isProcessing: true,
                                        tool_calls: []
                                    }
                                })
                            } catch (err) {
                                console.error("Failed to parse response created event:", err)
                            }
                        }
                        else if (event.type === "message:chunk") {
                            try {
                                const parsedEvent = Chat.Event.MessageChunk.Schema.parse(event);
                                if (!responseMessageId)
                                    throw new Error("Response message id not found");

                                this.useStore.setState(s => {
                                    const message = s.messagesRecord[responseMessageId!];

                                    message.content += parsedEvent.chunk;
                                })
                            } catch (err) {
                                console.error("Failed to parse message chunk event:", err)
                            }
                        }

                    }
                }
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
                chatId: Chat.Id,
                workflow: Workflow,
                snapshot: RuntimeSnapshot,
                attachments?: Chat.Message["attachments"]
            }) => Promise<void>
        },
        clearMessages: () => Promise<void>,
        setSidebarVisiblity: (show: boolean) => void,
    }

    export type Selectors = {}

}
