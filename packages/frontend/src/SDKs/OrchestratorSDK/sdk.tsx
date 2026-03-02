import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Orchestrator, Realtime, Runtime, Workflow } from "@vx-agent-editor/shared/domain";
import { useEffect } from "react";
import { RealtimeSDK } from "../Realtime/sdk";
import { createOrchestratorSDKActions, type OrchestratorSDKActions } from "./actions";

@SDK("Orchestrator")
export class OrchestratorSDKImpl extends BaseSDK<OrchestratorSDK.State> {
    
    
    constructor() { super() }


    public readonly useStore: BaseSDK.Store<OrchestratorSDK.State> = create(
        immer<OrchestratorSDK.State>(() => ({
            jobId: undefined,
            snapshot: Runtime.Snapshot.INITIAL,
            nodeStatuses: {}
        }))
    )

    public readonly reducers: OrchestratorSDK.Reducers = {}


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
            const topic = `job:${jobId}:events` as Realtime.Topic;
            const unsubscribe = RealtimeSDK.subscribeToTopic(topic, callback);
            return () => unsubscribe();
        }, [jobId, callback])
    }


    public handleOnJobChange = (prevJobId: Orchestrator.Job.Id | undefined, newJobId: Orchestrator.Job.Id | undefined) => {
        if (prevJobId === newJobId)
            return;

        if (!newJobId){
            this.runtime.unsubscribeFromJobTopic?.();
            return;
        }

        const topic = Orchestrator.Event.getTopic(newJobId);

        this.runtime.unsubscribeFromJobTopic = RealtimeSDK.subscribeToTopic(
            topic,
            (event: Orchestrator.Event) => {
                switch (event.type) {
                    case "started":
                        OrchestratorSDK.setState(s => s.jobId = event.jobId)
                        break;
                    case "update":
                        // @ts-expect-error
                        OrchestratorSDK.setState(s => s.snapshot = event.update)
                        break;
                    case "completed":
                        OrchestratorSDK.setState(s => {
                            s.jobId = undefined
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
    if (state.jobId === prevState.jobId)
        return;

    OrchestratorSDK.handleOnJobChange(prevState.jobId, state.jobId)
})


export namespace OrchestratorSDK {

    export type State = {
        jobId: Orchestrator.Job.Id | undefined
        snapshot: Runtime.Snapshot
        nodeStatuses: Record<Workflow.Node.Id, Runtime.NodeStatus>
    }

    export type Reducers = {
    }
    export type Actions = OrchestratorSDKActions;
    export type Selectors = {}
}