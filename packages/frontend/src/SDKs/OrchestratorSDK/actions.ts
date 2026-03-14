import { toast } from "sonner";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import { Orchestrator, Validation } from "@vx-agent-editor/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { type OrchestratorSDKImpl } from "./sdk"
import { ExecutionSessionSDK } from "../ExecutionSessionSDK/sdk";

export const createOrchestratorSDKActions = (sdk: OrchestratorSDKImpl) => {
    return {
        run: async () => {
            if (sdk.state.jobId) {
                toast.warning("Workflow is already running")
                return sdk.state.jobId
            }

            const workflow = WorkbenchSDK.state.workflow;
            const wfCache = WorkbenchSDK.state.cache;

            // Check if the workflow has issues
            const workflowIssues = Validation.Issue.checkWorkflow(workflow, wfCache);
            if (Object.entries(workflowIssues).length > 0) {
                toast.error("Workflow has nodes with missing fields or inputs. Please fix them before running.")
                return null
            }

            const executionPromise = Orchestrator.API.run(
                api,
                {
                    workflow,
                    executionSession: ExecutionSessionSDK.state.session
                }
            );

            toast.promise(executionPromise, {
                loading: "Preparing workflow execution",
                success: () => {
                    return `Workflow execution started`
                },
                error: (error) => {
                    const message = error?.response?.data?.error || error.message;
                    return `Workflow execution failed to start: ${message}`
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
            await Orchestrator.API.pause(api, { jobId });
        },
        terminate: async (jobId) => {
            await Orchestrator.API.terminate(api, { jobId });

            sdk.setState(s => s.jobId = undefined)
        }
    } satisfies OrchestratorSDKActions
}

export type OrchestratorSDKActions = {
    run: () => Promise<Orchestrator.Job.Id | null>,
    pause: (jobId: Orchestrator.Job.Id) => Promise<void>,
    terminate: (jobId: Orchestrator.Job.Id) => Promise<void>,
}