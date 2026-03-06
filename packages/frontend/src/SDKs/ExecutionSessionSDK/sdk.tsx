import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { ExecutionSession } from "@vx-agent-editor/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createExecutionSessionSDKActions, type ExecutionSessionSDKActions } from "./actions";

@SDK("ExecutionSession")
export class ExecutionSessionSDKImpl extends BaseSDK<ExecutionSessionSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ExecutionSessionSDK.State> = createWithEqualityFn(
        immer<ExecutionSessionSDK.State>(() => ({
            session: ExecutionSession.INITIAL,
        })),
        shallow
    )

    public readonly reducers: ExecutionSessionSDK.Reducers = {}

    public readonly runtime = {}

    public readonly actions: ExecutionSessionSDK.Actions = createExecutionSessionSDKActions(this);

    public readonly selectors: ExecutionSessionSDK.Selectors = {}
}

export const ExecutionSessionSDK = SDK.get<ExecutionSessionSDKImpl>("ExecutionSession")

export namespace ExecutionSessionSDK {

    export type State = {
        session: ExecutionSession
    }

    export type Reducers = {}
    export type Actions = ExecutionSessionSDKActions;
    export type Selectors = {}
}
