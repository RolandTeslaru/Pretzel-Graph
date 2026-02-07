import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Orchestrator, Realtime, Workflow } from "@vx-agent-editor/shared/types";
import { OrchestratorAPI } from "./api";
import { useEffect } from "react";
import { RealtimeSDK } from "../Realtime/sdk";
import { toast } from "sonner";

@SDK("Orchestrator")
export class OrchestratorSDKImpl extends BaseSDK<OrchestratorSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<OrchestratorSDK.State> = create(
        immer<OrchestratorSDK.State>(() => ({
            currentJobId: undefined,
            graphState: {

            }
        }))
    )

    public readonly reducers: OrchestratorSDK.Reducers = {}

    public readonly actions: OrchestratorSDK.Actions = {
        execution: {
            run: async (workflow) => {
                if(this.state.currentJobId){
                    toast.warning("Workflow is already running")
                    return this.state.currentJobId
                }

                const executionPromise = OrchestratorAPI.Execution.Run.execute(workflow);

                toast.promise(executionPromise, {
                    loading: "Executing workflow",
                    success: (data) => {
                        return `Workflow ${data.jobId} executed successfully`
                    },
                    error: (error) => {
                        return `Workflow execution failed: ${error.message}`
                    }
                })

                const data = await executionPromise;
                return data.jobId;
            },
            pause: async (jobId) => {
                await OrchestratorAPI.Execution.Pause.execute({ jobId });
            },
            terminate: async (jobId) => {
                await OrchestratorAPI.Execution.Terminate.execute({ jobId });

                this.setState(s => s.currentJobId = undefined)
            }
        }
    }

    public readonly selectors: OrchestratorSDK.Selectors = {}

    public useJobEvents = (
        jobId: Orchestrator.Job.Id,
        callback: (event: Orchestrator.Event.Job) => void
    ) => {
        useEffect(() => {
            const topic = `job:${jobId}:events` as Realtime.Topic.Id;
            const unsubscribe = RealtimeSDK.subscribeToTopic(topic, callback);
            return () => unsubscribe();
        }, [jobId, callback])
    }
}

export const OrchestratorSDK = SDK.get<OrchestratorSDKImpl>("Orchestrator")

export namespace OrchestratorSDK {

    export type State = {
        currentJobId: Orchestrator.Job.Id | undefined
    }

    export type Reducers = {
    }
    export type Actions = {
        execution: {
            run: (workflow: Workflow) => Promise<Orchestrator.Job.Id>,
            pause: (jobId: Orchestrator.Job.Id) => Promise<void>,
            terminate: (jobId: Orchestrator.Job.Id) => Promise<void>
        }
    }
    export type Selectors = {}
}