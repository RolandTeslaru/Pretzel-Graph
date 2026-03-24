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
                toast.error(`Workflow terminated`)
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


export namespace OrchestratorSDK {

    export type AwaitedConfirmation = "started" | "paused" | "resumed" | "terminated"

    export type State = {
        jobId: Orchestrator.Job.Id | undefined
        executionStatus: "idle" | "running" | "completed" | "failed" | "terminated"
        awaitedConfirmation: Set<"started" | "paused" | "resumed" | "terminated">
    }

    export type Reducers = typeof orchestratorSDKReducers
    export type Actions = OrchestratorSDKActions;
    export type Selectors = {}
}