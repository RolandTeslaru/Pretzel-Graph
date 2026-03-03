import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Orchestrator, Realtime, Execution, Workflow } from "@vx-agent-editor/shared/domain";
import { useEffect } from "react";
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
            executionContext: Execution.Context.INITIAL,
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


    public useJobEvents = (
        jobId: Orchestrator.Job.Id,
        callback: (event: Orchestrator.Event.Job) => void
    ) => {
        useEffect(() => {
            const topic = `job:${jobId}` as Realtime.Topic;
            const unsubscribe = RealtimeSDK.subscribeToTopic(topic, callback);
            return () => unsubscribe();
        }, [jobId, callback])
    }


    public handleOnJobChange = (
        prevJobId: Orchestrator.Job.Id | undefined, 
        newJobId: Orchestrator.Job.Id | undefined
    ) => {
        if (prevJobId === newJobId)
            return;

        if (!newJobId){
            this.runtime.unsubscribeFromJobTopic?.();
            return;
        }

        console.log

        const topic = Orchestrator.Event.getTopic(newJobId);

        this.runtime.unsubscribeFromJobTopic = RealtimeSDK.subscribeToTopic(
            topic,
            (event: Orchestrator.Event) => {
                console.log("Received event for job ", newJobId, event);
                switch (event.type) {
                    case "started":
                        OrchestratorSDK.setState(s => {
                            s.jobId = event.jobId;
                            s.executionStatus = "running";
                        })
                        break;
                    case "completed":
                        OrchestratorSDK.setState(s => {
                            s.jobId = undefined;
                            s.executionStatus = "completed";
                        })
                        break;
                    case "failed":
                        OrchestratorSDK.setState(s => {
                            s.jobId = undefined;
                            s.executionStatus = "failed";
                        })
                        break;
                    case "node:started":
                        OrchestratorSDK.setState(s => {
                            s.nodeStatuses[event.nodeId] = {
                                status: "running",
                                started_at: new Date().toISOString()
                            }
                        })
                        break;
                    case "node:completed":
                        OrchestratorSDK.setState(s => {
                            s.nodeStatuses[event.nodeId] = {
                                status: "completed",
                                started_at: s.nodeStatuses[event.nodeId]?.started_at,
                                completed_at: new Date().toISOString()
                            }
                        })
                        break;
                    case "node:error":
                        OrchestratorSDK.setState(s => {
                            s.nodeStatuses[event.nodeId] = {
                                status: "failed",
                                error: event.error,
                                started_at: s.nodeStatuses[event.nodeId]?.started_at,
                                completed_at: new Date().toISOString()
                            }
                        })
                        break;
                }
            });
    }
}

export const OrchestratorSDK = SDK.get<OrchestratorSDKImpl>("Orchestrator")


OrchestratorSDK.useStore.subscribe((state, prevState) => {

    console.log("JobId changed from ", prevState.jobId, " to ", state.jobId);

    if (state.jobId === prevState.jobId)
        return;

    OrchestratorSDK.handleOnJobChange(prevState.jobId, state.jobId)
})


export namespace OrchestratorSDK {

    export type State = {
        jobId: Orchestrator.Job.Id | undefined
        executionContext: Execution.Context
        nodeStatuses: Record<Workflow.Node.Id, Execution.NodeStatus>
        executionStatus: "idle" | "running" | "completed" | "failed"
    }

    export type Reducers = typeof orchestratorSDKReducers
    export type Actions = OrchestratorSDKActions;
    export type Selectors = {}
}