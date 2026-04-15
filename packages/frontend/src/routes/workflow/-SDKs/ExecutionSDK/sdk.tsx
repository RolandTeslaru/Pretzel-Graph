import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { Chat, ExecutionSession } from "@vx-agent-editor/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createExecutionSDKActions, type ExecutionSDKActions } from "./actions";
import { _createExecutionReducers_, type _ExecutionSessionReducers } from "./reducers";

@SDK("ExecutionSession")
export class ExecutionSDKImpl extends BaseSDK<ExecutionSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ExecutionSDK.State> = createWithEqualityFn(
        immer<ExecutionSDK.State>(() => ({
            session: ExecutionSession.createInitial(Chat.createId()),
        })),
        shallow
    )

    public readonly reducers: ExecutionSDK.Reducers = _createExecutionReducers_(this)

    public readonly runtime = {
        unsubscribeFromJobChannel: null as (() => void) | null
    }

    public readonly actions: ExecutionSDK.Actions = createExecutionSDKActions(this);

    public readonly selectors: ExecutionSDK.Selectors = {}
}

export const ExecutionSDK = SDK.get<ExecutionSDKImpl>("ExecutionSession")

export namespace ExecutionSDK {

    export type State = {
        session: ExecutionSession
    }

    export type Reducers = _ExecutionSessionReducers
    export type Actions = ExecutionSDKActions;
    export type Selectors = {}
}
