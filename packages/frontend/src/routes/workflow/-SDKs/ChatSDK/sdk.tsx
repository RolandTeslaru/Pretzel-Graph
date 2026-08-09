import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { Chat } from "@pretzel-graph/shared/domain";
import { createChatSDKActions, type ChatSDKActions } from "./actions";
import { createChatSDKReducers, type ChatSDKReducers } from "./reducers";
import { RealtimeSDK } from "@/SDKs/Realtime/sdk";
import { DialogSDK } from "@/SDKs/DialogSDK";
import type { ExecutionSDKImpl } from "../ExecutionSDK/sdk";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";

@SDK("Chat")
export class ChatSDKImpl extends BaseSDK<ChatSDK.State> {
    constructor() {
        super()
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
    public readonly reducers: ChatSDK.Reducers = createChatSDKReducers(this)


    public readonly actions = createChatSDKActions(this);


    public readonly selectors: ChatSDK.Selectors = {}


    public get executionSDK(): ExecutionSDKImpl { return SDK.get<ExecutionSDKImpl>("Execution") }

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
        }
    }
}

export const ChatSDK = SDK.get<ChatSDKImpl>("Chat")

ChatSDK.subscribe((state, prevState) => {
    if (state.currentChatId === prevState.currentChatId)
        return;

    ChatSDK.runtime.unsubscribeFromChatChannel?.();
    ChatSDK.runtime.unsubscribeFromChatChannel = null;

    if (!state.currentChatId)
        return;

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

    export type Reducers = ChatSDKReducers

    export type Actions = ChatSDKActions
    export type Selectors = {}
}
