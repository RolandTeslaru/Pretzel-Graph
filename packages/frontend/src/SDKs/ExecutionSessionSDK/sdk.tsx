import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { ExecutionSession } from "@vx-agent-editor/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createExecutionSessionSDKActions, type ExecutionSessionSDKActions } from "./actions";
import { RealtimeSDK } from "../Realtime/sdk";

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

    public readonly runtime = {
        unsubscribeFromJobTopic: null as (() => void) | null
    }

    public readonly actions: ExecutionSessionSDK.Actions = createExecutionSessionSDKActions(this);

    public readonly selectors: ExecutionSessionSDK.Selectors = {}


    public handleOnEvent(event: ExecutionSession.Event){
        console.log("EXECUTION SESSION EVENT ", event)

        switch(event.type){
            case "node:started":
                this.setState(s => {
                    const stat = s.session.node_status[event.nodeId]
                    stat.status = "running"
                })
                break;
            case "node:completed":
                this.setState(s => {
                    s.session.node_status[event.nodeId] = {
                        status: "completed",
                        completed_at: new Date().toISOString()
                    }
                })
                break;
            case "node:waiting":
                this.setState(s => {
                    s.session.node_status[event.nodeId] = {
                        status: "waiting",
                    }
                })
                break;
            case "node:error":
                this.setState(s => {
                    const stat = s.session.node_status[event.nodeId];
                    s.session.node_status[event.nodeId] = {
                        status: "failed",
                        error: event.error,
                        started_at: stat?.started_at,
                        completed_at: new Date().toISOString()
                    }
                })
                break;
        }
    }
}

export const ExecutionSessionSDK = SDK.get<ExecutionSessionSDKImpl>("ExecutionSession")


ExecutionSessionSDK.useStore.subscribe((state, prevState) => {
    if (state.session.id === prevState.session.id)
        return

    if (!state.session.id) {
        ExecutionSessionSDK.runtime.unsubscribeFromJobTopic?.();
        return;
    }

    ExecutionSessionSDK.runtime.unsubscribeFromJobTopic = RealtimeSDK.subscribeToTopic(
        ExecutionSession.Event.getTopic(state.session.id),
        ExecutionSessionSDK.handleOnEvent
    )
})


export namespace ExecutionSessionSDK {

    export type State = {
        session: ExecutionSession
    }

    export type Reducers = {}
    export type Actions = ExecutionSessionSDKActions;
    export type Selectors = {}
}
