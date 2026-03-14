import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Chat, Orchestrator } from "@vx-agent-editor/shared/domain";
import { QuerySDK } from "../QuerySDK/sdk";
import { createChatSDKActions, type ChatSDKActions } from "./actions";
import { RealtimeSDK } from "../Realtime/sdk";

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
    }


    public readonly runtime = {
        unsubscribeFromChatChannel: null as (() => void) | null
    }


    public readonly useStore: BaseSDK.Store<ChatSDK.State> = create(
        immer<ChatSDK.State>(() => ({
            currentChatId: null,
            messages: [],
            messagesRecord: {},
            isLoading: false,
            isSidebarVisible: false,
            chats: {},
        }))
    )


    public readonly reducers: ChatSDK.Reducers = {
        resolveJobId: (s, messageId, jobId) => {
            s.messagesRecord[messageId].job_id = jobId;
        },
        upsertMessage: (s, message) => {
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


    public handleOnEvent = (event: Chat.Event) => {
        console.log("ChatSDK received event: ", event);
        switch (event.type) {
            case "response:created":
                this.actions.message.upsert(event.responseMessage);
                break;
            case "response:chunk":
                this.actions.message.appendContent(event.responseMessageId, event.content);
                break;
            case "response:finished":
                this.actions.message.setContent(event.responseMessageId, event.finalContent);
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
        currentChatId: Chat.Id | null,
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
