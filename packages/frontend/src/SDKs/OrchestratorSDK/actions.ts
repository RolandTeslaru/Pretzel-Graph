import { toast } from "sonner";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import { Orchestrator, Validation } from "@vx-agent-editor/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { type OrchestratorSDKImpl } from "./sdk"

export const createOrchestratorSDKActions = (sdk: OrchestratorSDKImpl) => {
    return {
        execution: {
            run: async () => {
                if (sdk.state.jobId) {
                    toast.warning("Workflow is already running")
                    return sdk.state.jobId
                }


                sdk.setState(s => {
                    sdk.reducers.nodeStatuses.reset(s);
                })

                const workflow = WorkbenchSDK.state.workflow;
                const wfCache = WorkbenchSDK.state.cache;

                // Check if the workflow has issues
                const workflowIssues = Validation.Issue.checkWorkflow(workflow, wfCache);
                if (Object.entries(workflowIssues).length > 0) {
                    toast.error("Workflow has nodes with missing fields or inputs. Please fix them before running.")
                    return null
                }

                const executionPromise = Orchestrator.API.Execution.run(
                    api, {
                    workflow,
                    executionContext: sdk.state.executionContext
                }
                );

                toast.promise(executionPromise, {
                    loading: "Preparing workflow execution",
                    success: () => {
                        return `Workflow execution started`
                    },
                    error: (error) => {
                        const message = error?.response?.data?.error || error.message;
                        return `Workflow execution faile to start: ${message}`
                    }
                })

                const { jobId } = await executionPromise;

                sdk.setState(s => {
                    s.jobId = jobId 
                    s.executionStatus = "running"
                })

                return jobId;
            },
            pause: async (jobId) => {
                await Orchestrator.API.Execution.pause(api, { jobId });
            },
            terminate: async (jobId) => {
                await Orchestrator.API.Execution.terminate(api, { jobId });

                sdk.setState(s => s.jobId = undefined)
            }
        }
    } satisfies OrchestratorSDKActions
}

export type OrchestratorSDKActions = {
        execution: {
            run: () => Promise<Orchestrator.Job.Id | null>,
            pause: (jobId: Orchestrator.Job.Id) => Promise<void>,
            terminate: (jobId: Orchestrator.Job.Id) => Promise<void>
        }
    }