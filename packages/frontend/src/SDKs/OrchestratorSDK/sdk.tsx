import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Orchestrator, Workflow } from "@vx-agent-editor/shared/domain";
import { RealtimeSDK } from "../Realtime/sdk";
import { createOrchestratorSDKActions, type OrchestratorSDKActions } from "./actions";
import { orchestratorSDKReducers } from "./reducers";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";

@SDK("Orchestrator")
export class OrchestratorSDKImpl extends BaseSDK<OrchestratorSDK.State> {


    constructor() { super() }


    public readonly useStore: BaseSDK.Store<OrchestratorSDK.State> = createWithEqualityFn(
        immer<OrchestratorSDK.State>(() => ({
            jobId: undefined,
            executionStatus: "idle",
            nodeStatuses: {}
        })),
        shallow
    )

    public readonly reducers: OrchestratorSDK.Reducers = orchestratorSDKReducers


    public readonly runtime = {
        unsubscribeFromJobTopic: null as (() => void) | null
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
                break;
            case "failed":
                this.setState(s => {
                    s.jobId = undefined;
                    s.executionStatus = "failed";
                })
                break;
            case "node:started":
                this.setState(s => {
                    s.nodeStatuses[event.nodeId] = {
                        status: "running",
                        started_at: new Date().toISOString()
                    }
                })
                break;
            case "node:completed":
                this.setState(s => {
                    s.nodeStatuses[event.nodeId] = {
                        status: "completed",
                        started_at: s.nodeStatuses[event.nodeId]?.started_at,
                        completed_at: new Date().toISOString()
                    }
                })
                break;
            case "node:error":
                this.setState(s => {
                    s.nodeStatuses[event.nodeId] = {
                        status: "failed",
                        error: event.error,
                        started_at: s.nodeStatuses[event.nodeId]?.started_at,
                        completed_at: new Date().toISOString()
                    }
                })
                break;
        }
    }
}

export const OrchestratorSDK = SDK.get<OrchestratorSDKImpl>("Orchestrator")


OrchestratorSDK.useStore.subscribe((state, prevState) => {
    if (state.jobId === prevState.jobId)
        return;

    if (!state.jobId) {
        OrchestratorSDK.runtime.unsubscribeFromJobTopic?.();
        return;
    }

    OrchestratorSDK.runtime.unsubscribeFromJobTopic = RealtimeSDK.subscribeToTopic(
        Orchestrator.Event.getTopic(state.jobId),
        OrchestratorSDK.handleOnEvent
    )
})


export namespace OrchestratorSDK {

    export type State = {
        jobId: Orchestrator.Job.Id | undefined
        nodeStatuses: Record<Workflow.Node.Id, any>
        executionStatus: "idle" | "running" | "completed" | "failed"
    }

    export type Reducers = typeof orchestratorSDKReducers
    export type Actions = OrchestratorSDKActions;
    export type Selectors = {}
}