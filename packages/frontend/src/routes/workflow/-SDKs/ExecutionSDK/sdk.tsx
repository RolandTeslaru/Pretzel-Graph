import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { Execution } from "@pretzel-graph/shared/domain";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { createExecutionSDKActions, type ExecutionSDKActions } from "./actions";
import { _createExecutionReducers_, initialTimelineState, type _ExecutionSessionReducers } from "./reducers";
import { executionSDKSelectors, type ExecutionSDKSelectors, type TimelineLayout } from "./selectors";
import type { TimeScale, TimelineViewMode } from "./ui/Timeline/time-scale";
import { RealtimeSDK } from "@/SDKs/Realtime/sdk";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { handleExecutionEvents } from "./handle-events";
import { observeCurrentExecution, type CurrentExecutionObserver, type ObserveOptions as ObserveOptions_ } from "./observe";
import type { ChatSDKImpl } from "../ChatSDK/sdk";

@SDK("Execution")
export class ExecutionSDKImpl extends BaseSDK<ExecutionSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<ExecutionSDK.State> = createWithEqualityFn(
        immer<ExecutionSDK.State>(() => ({
            currentExecution: undefined,
            executionHistory: [],
            awaitedConfirmation: new Set(),
            selectors: executionSDKSelectors,
            igniterAttributes: {
                record: false,
                debug: false
            },
            timeline: initialTimelineState(),
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
        // Plain ref objects (no useRef) so the timeline's DOM refs live on the
        // SDK and don't have to be drilled / contexted through the component tree.
        timeline: {
            scrollRef: { current: null as HTMLDivElement | null },
            rulerRef:  { current: null as HTMLDivElement | null },
            labelsRef: { current: null as HTMLDivElement | null },
        },
    }

    // Scroll sync: the main canvas drives the ruler (x) and labels (y).
    public syncTimelineScroll = () => {
        const { scrollRef, rulerRef, labelsRef } = this.runtime.timeline;
        const sc = scrollRef.current;
        if (!sc) return;
        if (rulerRef.current)  rulerRef.current.scrollLeft  = sc.scrollLeft;
        if (labelsRef.current) labelsRef.current.scrollTop  = sc.scrollTop;
    }
    public syncTimelineLabelScroll = () => {
        const { scrollRef, labelsRef } = this.runtime.timeline;
        const lb = labelsRef.current;
        if (!lb) return;
        if (scrollRef.current) scrollRef.current.scrollTop = lb.scrollTop;
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

    public unsubscribeFromEvents() {
        this.runtime.unsubscribeFromEvents?.();
        this.runtime.unsubscribeFromEvents = null;
        this.runtime.subscribedExecutionId = null;
    }

    /**
     * Watch the execution currently in view. Returns an unsubscribe.
     * See ./observe.ts for the transition → callback mapping.
     */
    public observeCurrent(observer: ExecutionSDK.Observer, opts?: ExecutionSDK.ObserveOptions) {
        return observeCurrentExecution(this, observer, opts);
    }

    public handleOnEvent = (e: Execution.Event) => { handleExecutionEvents(this, e) }

    public get chatSDK(): ChatSDKImpl { return SDK.get<ChatSDKImpl>("Chat") }
}

export const ExecutionSDK = SDK.get<ExecutionSDKImpl>("Execution")




// Subscribe to current execution events
ExecutionSDK.observeCurrent({
    onDetach: () => ExecutionSDK.unsubscribeFromEvents(),
    onAttach: (execution) => ExecutionSDK.subscribeToEvents(execution.id),
}, { immediate: true })




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

ExecutionSDK.observeCurrent({
    onPause:  (execution) => startHeartbeat(execution.id),
    onDetach: () => stopHeartbeat(),

    onStatusChange: (_, from) => {
        if (from === "paused")
            stopHeartbeat();
    },

    onAttach: (execution) => {
        if (execution.status === "paused")
            startHeartbeat(execution.id);
    },
}, { immediate: true })






export namespace ExecutionSDK {
    export type AwaitedConfirmation = "started" | "paused" | "resumed" | "terminated" | "suspended" | "executed"

    export type State = {
        currentExecution?: Execution
        executionHistory: Execution.Meta[]
        awaitedConfirmation: Set<AwaitedConfirmation>
        selectors: ExecutionSDKSelectors
        igniterAttributes: {
            record: boolean,
            debug: boolean,
        },
        timeline: {
            zoom:          number
            viewMode:      TimelineViewMode
            showRemnants:  boolean
            selectedUoW:   Execution.Recording.UnitOfWork.Id | null
            layout:        TimelineLayout
            scale:         TimeScale
            totalDuration: number
            totalWidth:    number
        }
    }

    export type Reducers = _ExecutionSessionReducers
    export type Actions = ExecutionSDKActions;
    export type Selectors = ExecutionSDKSelectors
    export type Observer = CurrentExecutionObserver
    export type ObserveOptions = ObserveOptions_
}
