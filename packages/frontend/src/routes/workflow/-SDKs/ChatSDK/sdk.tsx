import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { Chat, Orchestrator } from "@pretzel-graph/shared/domain";
import { QuerySDK } from "@/SDKs/QuerySDK/sdk";
import { createChatSDKActions, type ChatSDKActions } from "./actions";
import { RealtimeSDK } from "@/SDKs/Realtime/sdk";
import { DialogSDK } from "@/SDKs/DialogSDK";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";

@SDK("Chat")
export class ChatSDKImpl extends BaseSDK<ChatSDK.State> {
    constructor() {
        super()
        QuerySDK.client.invalidateQueries({ queryKey: ["chats"] })
        QuerySDK.client.fetchQuery({
            queryKey: ["chats"],
            queryFn: () => this.actions.chat.getAll(),
            staleTime: Infinity
        })

        this.runtime.unsubscribeFromChatChannel = RealtimeSDK.subscribeToChannel(
            Chat.Event.getChannel(this.state.currentChatId),
            this.handleOnEvent
        )
    }


    public readonly runtime = {
        unsubscribeFromChatChannel: null as (() => void) | null
    }


    public readonly useStore: BaseSDK.Store<ChatSDK.State> = createWithEqualityFn(
        immer<ChatSDK.State>(() => ({
            currentChatId: Chat.createId(),
            messages: [],
            messagesRecord: {},
            isLoading: false,
            isSidebarVisible: false,
            chats: {},
        })),
        shallow
    )


    public readonly reducers: ChatSDK.Reducers = {
        resolveJobId: (s, messageId, jobId) => {
            s.messagesRecord[messageId].job_id = jobId;
        },
        upsertMessage: (s, message) => {
            // If its not in the messages record then its not in the msessage stack aswell, so push it.
            if (!s.messagesRecord[message.id]) {
                s.messages.push(message.id);
            }
            s.messagesRecord[message.id] = message;
        },
        appendContent: (s, messageId, content) => {
            s.messagesRecord[messageId].content += content;
        },
    }


    public readonly actions = createChatSDKActions(this);


    public readonly selectors: ChatSDK.Selectors = {}


    public handleOnEvent = (e: Chat.Event) => {
        switch (e.type) {
            case "message:added":
                this.useStore.setState(s => {
                    e.messages.forEach(m => {
                        this.reducers.upsertMessage(s, m);

                        if (DialogSDK.state.dialogs.has("fullscreen-chat") === false)
                            s.isSidebarVisible = true;
                    })
                })
                break;
            case "response:created":
                this.useStore.setState(s => {
                    this.reducers.upsertMessage(s, e.responseMessage);

                    if (DialogSDK.state.dialogs.has("fullscreen-chat") === false)
                        s.isSidebarVisible = true;
                })
                break;
            case "response:chunk":
                this.actions.message.appendContent(e.responseMessageId, e.content);
                break;
            case "response:finished":
                this.actions.message.setContent(e.responseMessageId, e.finalContent);
                break;
        }
    }
}

export const ChatSDK = SDK.get<ChatSDKImpl>("Chat")

ChatSDK.subscribe((state, prevState) => {
    if (state.currentChatId === prevState.currentChatId)
        return;

    if (!state.currentChatId) {
        ChatSDK.runtime.unsubscribeFromChatChannel?.();
        return;
    }

    ChatSDK.runtime.unsubscribeFromChatChannel = RealtimeSDK.subscribeToChannel(
        Chat.Event.getChannel(state.currentChatId),
        ChatSDK.handleOnEvent
    )
})



export namespace ChatSDK {
    export type State = {
        currentChatId: Chat.Id,
        messages: Chat.Message.Id[],
        messagesRecord: Record<Chat.Message.Id, Chat.Message>,
        isLoading: boolean,
        isSidebarVisible: boolean,
        chats: Record<Chat.Id, Chat>,
    }

    export type Reducers = {
        resolveJobId: (state: State, messageId: Chat.Message.Id, jobId: Orchestrator.Job.Id) => void
        upsertMessage: (state: State, message: Chat.Message) => void
        appendContent: (state: State, messageId: Chat.Message.Id, content: string) => void
    }

    export type Actions = ChatSDKActions
    export type Selectors = {}
}
