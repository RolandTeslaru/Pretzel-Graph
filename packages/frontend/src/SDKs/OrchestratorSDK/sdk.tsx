import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { Orchestrator, Realtime, Validation, Workflow } from "@vx-agent-editor/shared/domain";
import { useEffect } from "react";
import { RealtimeSDK } from "../Realtime/sdk";
import { toast } from "sonner";
import { api } from "../ApiInterceptorSDK";

@SDK("Orchestrator")
export class OrchestratorSDKImpl extends BaseSDK<OrchestratorSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<OrchestratorSDK.State> = create(
        immer<OrchestratorSDK.State>(() => ({
            currentJobId: undefined,
            runtimeState: Orchestrator.RuntimeState.INITIAL
        }))
    )

    public readonly reducers: OrchestratorSDK.Reducers = {}

    public readonly actions: OrchestratorSDK.Actions = {
        execution: {
            run: async (workflow, wfCache) => {
                if (this.state.currentJobId) {
                    toast.warning("Workflow is already running")
                    return this.state.currentJobId
                }

                // Check if the workflow has issues
                const workflowIssues = Validation.Issue.checkWorkflow(workflow, wfCache);
                if (Object.entries(workflowIssues).length > 0) {
                    toast.error("Workflow has nodes with missing fields or inputs. Please fix them before running.")
                    return null
                }

                const executionPromise = Orchestrator.API.Execution.run(api, workflow);

                toast.promise(executionPromise, {
                    loading: "Executing workflow",
                    success: (data) => {
                        return `Workflow execution started`
                    },
                    error: (error) => {
                        const message = error?.response?.data?.error || error.message;
                        return `Workflow execution faile to start: ${message}`
                    }
                })

                const data = await executionPromise;
                return data.jobId;
            },
            pause: async (jobId) => {
                await Orchestrator.API.Execution.pause(api, { jobId });
            },
            terminate: async (jobId) => {
                await Orchestrator.API.Execution.terminate(api, { jobId });

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
        runtimeState: Orchestrator.RuntimeState
    }

    export type Reducers = {
    }
    export type Actions = {
        execution: {
            run: (workflow: Workflow, cache: Workflow.Cache) => Promise<Orchestrator.Job.Id | null>,
            pause: (jobId: Orchestrator.Job.Id) => Promise<void>,
            terminate: (jobId: Orchestrator.Job.Id) => Promise<void>
        }
    }
    export type Selectors = {}
}