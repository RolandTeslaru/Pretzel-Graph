import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { Execution, Recording } from "@pretzel-graph/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createExecutionSDKActions, type ExecutionSDKActions } from "./actions";
import { _createExecutionReducers_, type _ExecutionSessionReducers } from "./reducers";
import { executionSDKSelectors, type ExecutionSDKSelectors } from "./selectors";
import { RealtimeSDK } from "@/SDKs/Realtime/sdk";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { handleExecutionEvents } from "./handle-events";

@SDK("Execution")
export class ExecutionSDKImpl extends BaseSDK<ExecutionSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ExecutionSDK.State> = createWithEqualityFn(
        immer<ExecutionSDK.State>(() => ({
            currentExecution: undefined,
            executionHistory: [],
            awaitedConfirmation: new Set(),
            recordingViewer: {
                currentRecording: null,
                zoom: 0.2,
                selectedUoW: null,
                showRemnants: true,
            },
            selectedIgniter: "workbench_manual",
            selectors: executionSDKSelectors,
            recordExecution: false,
            isCurrentExecutionRecording: false,
        })),
        shallow
    )

    public readonly reducers:  ExecutionSDK.Reducers  = _createExecutionReducers_(this)
    public readonly actions:   ExecutionSDK.Actions   = createExecutionSDKActions(this);
    public readonly selectors: ExecutionSDK.Selectors = executionSDKSelectors;
    
    public useAwaitConfirmation = (event: ExecutionSDK.AwaitedConfirmation): () => void => {
        this.actions.addAwaitedConfirmation(event);
        return () => { this.actions.removeAwaitedConfirmation(event); };
    }
    
    public readonly runtime = {
        unsubscribeFromEvents: null as (() => void) | null,
        subscribedExecutionId:  null as Execution.Id | null,
    }

    public subscribeToEvents(executionId: Execution.Id) {
        if (this.runtime.subscribedExecutionId === executionId) return;

        this.runtime.unsubscribeFromEvents?.();
        this.runtime.subscribedExecutionId = executionId;

        console.log("Subscribing to execution events for executionId:", executionId)

        this.runtime.unsubscribeFromEvents = RealtimeSDK.subscribeToChannel(
            Execution.Event.getChannel(executionId),
            this.handleOnEvent
        )
    }

    public handleOnEvent = (e: Execution.Event | Recording.Event) => { handleExecutionEvents(this, e) }
}

export const ExecutionSDK = SDK.get<ExecutionSDKImpl>("Execution")




// Subscribe to current execution events
ExecutionSDK.subscribe((state, prev) => {
    if(state.currentExecution?.id === prev.currentExecution?.id)
        return

    if(!state.currentExecution) {
        ExecutionSDK.runtime.unsubscribeFromEvents?.();
        return
    }

    ExecutionSDK.subscribeToEvents(state.currentExecution!.id)
})




// Heartbeat: while paused, send a heartbeat every 2 minutes on mouse activity
// to prevent the worker from terminating the paused job.
const HEARTBEAT_INTERVAL_MS = 2 * 60_000;
let heartbeatListener: (() => void) | null = null;

function startHeartbeat(executionId: Execution.Id) {
    stopHeartbeat();

    let lastSent = 0;

    heartbeatListener = () => {
        const now = Date.now();
        if (now - lastSent < HEARTBEAT_INTERVAL_MS) return;
        lastSent = now;
        Execution.API.heartbeat(api, { executionId }).catch(() => {});
    };

    document.addEventListener("mousemove", heartbeatListener);
}

function stopHeartbeat() {
    if (heartbeatListener) {
        document.removeEventListener("mousemove", heartbeatListener);
        heartbeatListener = null;
    }
}

ExecutionSDK.subscribe((state, prev) => {
    if(state.currentExecution?.status === prev.currentExecution?.status)
        return

    if(state.currentExecution?.status === "paused")
        startHeartbeat(state.currentExecution.id)
    else
        stopHeartbeat()
})






export namespace ExecutionSDK {
    export type AwaitedConfirmation = "started" | "paused" | "resumed" | "terminated" | "suspended" | "executed"

    export type RecordingViewer = {
        currentRecording: Recording | null
        zoom: number
        selectedUoW: Recording.UnitOfWork.Id | null
        showRemnants: boolean
    }

    export type State = {
        currentExecution?: Execution
        executionHistory: Execution.Meta[]
        awaitedConfirmation: Set<AwaitedConfirmation>
        recordingViewer: RecordingViewer
        selectors: ExecutionSDKSelectors
        selectedIgniter: Execution.Igniter["variant"],
        recordExecution: boolean
        isCurrentExecutionRecording: boolean
    }

    export type Reducers = _ExecutionSessionReducers
    export type Actions = ExecutionSDKActions;
    export type Selectors = ExecutionSDKSelectors
}
