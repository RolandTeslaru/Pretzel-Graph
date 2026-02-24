import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";

@SDK("Chat")
export class ChatSDKImpl extends BaseSDK<ChatSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ChatSDK.State> = create(
        immer<ChatSDK.State>(() => ({
            messages: [],
            isLoading: false,
            isSidebarVisible: false,
        }))
    )

    public readonly reducers: ChatSDK.Reducers = {}

    public readonly actions: ChatSDK.Actions = {
        sendMessage: async (config) => {

        },
        clearMessages: async () => {
            this.setState(s => {
                s.messages = [];
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

    export type Message = {
        id: string,
        role: "user" | "assistant",
        content: string,
        createdAt: string,
    }

    export type State = {
        messages: Message[],
        isLoading: boolean,
        isSidebarVisible: boolean
    }

    export type Reducers = {}

    export type Actions = {
        sendMessage: (config: { content: string }) => Promise<void>,
        clearMessages: () => Promise<void>,
        setSidebarVisiblity: (show: boolean) => void,
    }

    export type Selectors = {}

}
