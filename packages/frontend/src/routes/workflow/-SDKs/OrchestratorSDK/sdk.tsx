import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { Orchestrator } from "@vx-agent-editor/shared/domain";
import { RealtimeSDK } from "@/SDKs/Realtime/sdk";
import { createOrchestratorSDKActions, type OrchestratorSDKActions } from "./actions";
import { orchestratorSDKReducers } from "./reducers";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { toast } from "sonner";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { ExecutionSessionSDK } from "../ExecutionSessionSDK/sdk";

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

    public useAwaitConfirmation = (event: OrchestratorSDK.AwaitedConfirmation): () => void => {
        this.actions.addAwaitedConfirmation(event);
        return () => { this.actions.removeAwaitedConfirmation(event); };
    }


    public handleOnEvent = (event: Orchestrator.Event) => {
        console.log("Orchestrator Event Received:", event.type)
    }

    public unsubscribe(){
        this.runtime.unsubscribeFromJobChannel?.();
    }

    public subscribeToJob(jobId: Orchestrator.Job.Id) {
        this.unsubscribe();

        console.log("Orchestrator Subscribing to job channel for jobId", jobId)
        
        this.runtime.unsubscribeFromJobChannel = RealtimeSDK.subscribeToChannel(
            Orchestrator.Event.getChannel(jobId),
            this.handleOnEvent
        );
    }

    

}

export const OrchestratorSDK = SDK.get<OrchestratorSDKImpl>("Orchestrator")


// OrchestratorSDK.useStore.subscribe((state, prevState) => {
//     if (state.jobId === prevState.jobId)
//         return;

//     if (!state.jobId) {
//         OrchestratorSDK.runtime.unsubscribeFromJobChannel?.();
//         return;
//     }

//     // console.log("Orchestrator Subscribing to job channel for jobId", state.jobId)

//     // OrchestratorSDK.runtime.unsubscribeFromJobChannel = RealtimeSDK.subscribeToChannel(
//     //     Orchestrator.Event.getChannel(state.jobId),
//     //     OrchestratorSDK.handleOnEvent
//     // )
// })


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