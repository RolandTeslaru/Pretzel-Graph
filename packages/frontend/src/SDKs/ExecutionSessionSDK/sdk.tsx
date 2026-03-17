import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { ExecutionSession } from "@vx-agent-editor/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createExecutionSessionSDKActions, type ExecutionSessionSDKActions } from "./actions";
import { RealtimeSDK } from "../Realtime/sdk";
import { _createExecutionSessionReducers_, type _ExecutionSessionReducers } from "./reducers";
import { cloneDeep } from "lodash";

@SDK("ExecutionSession")
export class ExecutionSessionSDKImpl extends BaseSDK<ExecutionSessionSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ExecutionSessionSDK.State> = createWithEqualityFn(
        immer<ExecutionSessionSDK.State>(() => ({
            session: cloneDeep(ExecutionSession.INITIAL),
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

        this.runtime.unsubscribeFromJobChannel = RealtimeSDK.subscribeToChannel(
            channel,
            this.handleOnEvent
        );
    }



    public handleOnEvent = (event: ExecutionSession.Event) => {
        if (event.type === "node:started") {
            this.actions.session.setNodeStatus(event.nodeId, { status: "running", started_at: new Date().toISOString() })
        }
        else if (event.type === "node:completed") {
            this.actions.session.setNodeStatus(event.nodeId, { status: "completed", completed_at: new Date().toISOString() })
        }
        else if (event.type === "node:waiting") {
            this.actions.session.setNodeStatus(event.nodeId, { status: "waiting" })
        }
        else if (event.type === "node:error") {
            this.actions.session.setNodeStatus(event.nodeId, { status: "failed", error: event.error, completed_at: new Date().toISOString() })
        }
        else if (event.type === "update") {
            if (event.update.edge_state) {
                this.setState(s => {
                    Object.assign(s.session.edge_state, event.update.edge_state);
                });
            }
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
