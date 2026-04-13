import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Chat, ExecutionSession } from "@vx-agent-editor/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createExecutionSessionSDKActions, type ExecutionSessionSDKActions } from "./actions";
import { RealtimeSDK } from "../Realtime/sdk";
import { _createExecutionSessionReducers_, type _ExecutionSessionReducers } from "./reducers";
import { toast } from "sonner";

@SDK("ExecutionSession")
export class ExecutionSessionSDKImpl extends BaseSDK<ExecutionSessionSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ExecutionSessionSDK.State> = createWithEqualityFn(
        immer<ExecutionSessionSDK.State>(() => ({
            session: ExecutionSession.createInitial(Chat.createId()),
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



    public handleOnEvent = (e: ExecutionSession.Event) => {
        console.log("Execution Session Event Received:", e.type)
        switch(e.type){
            case "node:started":
                this.setState(s => {
                    if(e.stateUpdate)
                        this.reducers.applyUpdate(s, e.stateUpdate);
                    this.reducers.setNodeStatus(s, e.nodeId, { status: "running", started_at: new Date().toISOString() })
                })
                break;
            case "node:completed":
                this.setState(s => {
                    s.session.node_output_projections[e.nodeId] = e.output as any;
                    if(e.stateUpdate)
                        this.reducers.applyUpdate(s, e.stateUpdate);
                    this.reducers.setNodeStatus(s, e.nodeId, { status: "completed", completed_at: new Date().toISOString() })
                })
                break;
            case "node:waiting":
                this.actions.setNodeStatus(e.nodeId, { status: "waiting" })
                break;
            case "node:error":
                this.actions.setNodeStatus(e.nodeId, { status: "failed", error: e.error, completed_at: new Date().toISOString() })
                break;
            case "update":
                this.setState(s => {
                    this.reducers.applyUpdate(s, e.update);
                })
                break;
            default:
                toast.error(`Received unknown event: ${e.type}`)
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
