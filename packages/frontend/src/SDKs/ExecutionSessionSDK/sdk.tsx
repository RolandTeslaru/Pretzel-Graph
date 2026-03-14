import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { ExecutionSession } from "@vx-agent-editor/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createExecutionSessionSDKActions, type ExecutionSessionSDKActions } from "./actions";
import { RealtimeSDK } from "../Realtime/sdk";
import { _createExecutionSessionReducers_, type _ExecutionSessionReducers } from "./reducers";

@SDK("ExecutionSession")
export class ExecutionSessionSDKImpl extends BaseSDK<ExecutionSessionSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ExecutionSessionSDK.State> = createWithEqualityFn(
        immer<ExecutionSessionSDK.State>(() => ({
            session: ExecutionSession.INITIAL,
        })),
        shallow
    )

    public readonly reducers: ExecutionSessionSDK.Reducers = _createExecutionSessionReducers_(this)

    public readonly runtime = {
        unsubscribeFromJobChannel: null as (() => void) | null
    }

    public readonly actions: ExecutionSessionSDK.Actions = createExecutionSessionSDKActions(this);

    public readonly selectors: ExecutionSessionSDK.Selectors = {}

    public subscribeToEvents() {
        // Unsubscribe from previous channel if any
        this.runtime.unsubscribeFromJobChannel?.();

        const channel = ExecutionSession.Event.getChannel(this.state.session.id);
        console.log("Subscribing to channel ", channel)
        this.runtime.unsubscribeFromJobChannel = RealtimeSDK.subscribeToChannel(
            channel,
            this.handleOnEvent
        );
    }



    public handleOnEvent = (event: ExecutionSession.Event) => {
        console.log("EXECUTION SESSION EVENT ", event)

        if (event.type === "node:started") {
            this.setState(s => this.reducers.nodeStarted(s, event.nodeId))
        }
        else if (event.type === "node:completed") {
            this.setState(s => this.reducers.nodeCompleted(s, event.nodeId))
        }
        else if (event.type === "node:waiting") {
            this.setState(s => this.reducers.nodeWaiting(s, event.nodeId))
        }
        else if (event.type === "node:error") {
            this.setState(s => this.reducers.nodeError(s, event.nodeId, event.error))
        }
    }
}

export const ExecutionSessionSDK = SDK.get<ExecutionSessionSDKImpl>("ExecutionSession")

// Always stay subscribed to the current session's channel.
// Subscribe immediately, and re-subscribe whenever session.id changes.
ExecutionSessionSDK.subscribeToEvents();

ExecutionSessionSDK.useStore.subscribe((state, prevState) => {
    if (state.session.id === prevState.session.id)
        return;

    ExecutionSessionSDK.subscribeToEvents();
})

export namespace ExecutionSessionSDK {

    export type State = {
        session: ExecutionSession
    }

    export type Reducers = _ExecutionSessionReducers
    export type Actions = ExecutionSessionSDKActions;
    export type Selectors = {}
}
