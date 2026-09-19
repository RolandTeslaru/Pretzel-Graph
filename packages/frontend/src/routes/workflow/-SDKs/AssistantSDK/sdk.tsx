import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import { Assistant, Chat } from "@pretzel-graph/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createAssistantSDKActions, type AssistantSDKActions } from "./actions";
import { createAssistantSDKReducers, type AssistantSDKReducers } from "./reducers";

@SDK("Assistant")
export class AssistantSDKImpl extends BaseSDK<AssistantSDK.State> {
    constructor() {
        super()
    }

    public readonly useStore: BaseSDK.Store<AssistantSDK.State> = createWithEqualityFn(
        immer<AssistantSDK.State>(() => ({
            currentAssistantId: Assistant.createId(),
            messages: [],
            messagesRecord: {},
            toolCallStatus: {},
            isLoading: false,
            isSidebarVisible: false,
            assistants: {},
        })),
        shallow
    )

    public readonly reducers: AssistantSDK.Reducers = createAssistantSDKReducers(this)

    public readonly actions: AssistantSDK.Actions = createAssistantSDKActions(this)

    public readonly selectors: AssistantSDK.Selectors = {}
}

export const AssistantSDK = SDK.get<AssistantSDKImpl>("Assistant")

export namespace AssistantSDK {
    export type State = {
        currentAssistantId: Assistant.Id,
        messages: Chat.Message.Id[],
        messagesRecord: Record<Chat.Message.Id, Chat.Message>,
        toolCallStatus: Record<Chat.ToolCall.Id, Chat.ToolCall.Status>,
        isLoading: boolean,
        isSidebarVisible: boolean,
        assistants: Record<Assistant.Id, Assistant>,
    }

    export type Reducers = AssistantSDKReducers
    export type Actions = AssistantSDKActions
    export type Selectors = {}
}
