import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Orchestrator } from "@vx-agent-editor/shared/domain";
import { RealtimeSDK } from "../Realtime/sdk";
import { createOrchestratorSDKActions, type OrchestratorSDKActions } from "./actions";
import { orchestratorSDKReducers } from "./reducers";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { toast } from "sonner";
import { api } from "../ApiInterceptorSDK";

@SDK("Orchestrator")
export class OrchestratorSDKImpl extends BaseSDK<OrchestratorSDK.State> {
    
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<OrchestratorSDK.State> = createWithEqualityFn(
        immer<OrchestratorSDK.State>(() => ({
            jobId: undefined,
            executionStatus: "idle",
            awaitedConfirmation: new Set()
        })),
        shallow
    )

    public readonly reducers: OrchestratorSDK.Reducers = orchestratorSDKReducers


    public readonly runtime = {
        unsubscribeFromJobChannel: null as (() => void) | null
    }


    public readonly actions: OrchestratorSDK.Actions = createOrchestratorSDKActions(this);


    public readonly selectors: OrchestratorSDK.Selectors = {}


    public handleOnEvent = (event: Orchestrator.Event) => {
        switch (event.type) {
            case "started":
                this.setState(s => {
                    s.jobId = event.jobId;
                    s.executionStatus = "running";
                })
                break;
            case "completed":
                this.setState(s => {
                    s.jobId = undefined;
                    s.executionStatus = "completed";
                })
                toast.success(`Workflow completed successfully`)
                break;
            case "failed":
                this.setState(s => {
                    s.jobId = undefined;
                    s.executionStatus = "failed";
                })
                toast.error(`Workflow execution failed: ${event.error.message} [${event.error.code}]`)
                break;
            case "terminated":
                this.setState(s => {
                    s.jobId = undefined;
                    s.executionStatus = "terminated"
                })
                toast.error(`Workflow execution terminated`)
                break;
            case "paused":
                this.setState(s => {
                    s.executionStatus = "paused"
                })
                toast.info(`Workflow execution paused`)
                break;
            case "resumed":
                this.setState(s => {
                    s.executionStatus = "running"
                })
                toast.info(`Workflow execution resumed`)
                break;
        }
    }
}

export const OrchestratorSDK = SDK.get<OrchestratorSDKImpl>("Orchestrator")


OrchestratorSDK.useStore.subscribe((state, prevState) => {
    if (state.jobId === prevState.jobId)
        return;

    if (!state.jobId) {
        OrchestratorSDK.runtime.unsubscribeFromJobChannel?.();
        return;
    }

    OrchestratorSDK.runtime.unsubscribeFromJobChannel = RealtimeSDK.subscribeToChannel(
        Orchestrator.Event.getChannel(state.jobId),
        OrchestratorSDK.handleOnEvent
    )
})


// Heartbeat: while paused, send a heartbeat every 2 minutes on mouse activity
// to prevent the worker from terminating the paused job.
const HEARTBEAT_INTERVAL_MS = 2 * 60_000;
let heartbeatListener: (() => void) | null = null;

function startHeartbeat(jobId: Orchestrator.Job.Id) {
    stopHeartbeat();

    let lastSent = 0;

    heartbeatListener = () => {
        const now = Date.now();
        if (now - lastSent < HEARTBEAT_INTERVAL_MS) return;
        lastSent = now;
        Orchestrator.API.heartbeat(api, { jobId }).catch(() => {});
    };

    document.addEventListener("mousemove", heartbeatListener);
}

function stopHeartbeat() {
    if (heartbeatListener) {
        document.removeEventListener("mousemove", heartbeatListener);
        heartbeatListener = null;
    }
}

OrchestratorSDK.useStore.subscribe((state, prevState) => {
    if (state.executionStatus === prevState.executionStatus) return;

    if (state.executionStatus === "paused" && state.jobId) {
        startHeartbeat(state.jobId);
    } else {
        stopHeartbeat();
    }
});


export namespace OrchestratorSDK {

    export type AwaitedConfirmation = "started" | "paused" | "resumed" | "terminated" | "suspended"

    export type State = {
        jobId: Orchestrator.Job.Id | undefined
        executionStatus: "idle" | "running" | "completed" | "failed" | "terminated" | "paused" | "suspended"
        awaitedConfirmation: Set<"started" | "paused" | "resumed" | "terminated" | "suspended">
    }

    export type Reducers = typeof orchestratorSDKReducers
    export type Actions = OrchestratorSDKActions;
    export type Selectors = {}
}