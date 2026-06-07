import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { Assistant } from "@pretzel-graph/shared/domain";
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
        messages: Assistant.Message.Id[],
        messagesRecord: Record<Assistant.Message.Id, Assistant.Message>,
        isLoading: boolean,
        isSidebarVisible: boolean,
        assistants: Record<Assistant.Id, Assistant>,
    }

    export type Reducers = AssistantSDKReducers
    export type Actions = AssistantSDKActions
    export type Selectors = {}
}
