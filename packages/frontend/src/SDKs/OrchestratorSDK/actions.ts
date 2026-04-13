import { toast } from "sonner";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import { Chat, Orchestrator, Validation } from "@vx-agent-editor/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { type OrchestratorSDKImpl, type OrchestratorSDK } from "./sdk"
import { ExecutionSessionSDK } from "../ExecutionSessionSDK/sdk";

export const createOrchestratorSDKActions = (sdk: OrchestratorSDKImpl) => {
    return {
        run: async () => {
            sdk.actions.addAwaitedConfirmation("started")


            const confirmEvent = () => {
                sdk.actions.removeAwaitedConfirmation("started")
            }

            if (sdk.state.jobId) {
                toast.warning("Workflow is already running")
                confirmEvent();
                return sdk.state.jobId
            }

            WorkbenchSDK.actions.workflow.validate()

            const workflow = WorkbenchSDK.state.workflow;

            if (Validation.workflowHasIssues(WorkbenchSDK.state.issues)) {
                toast.error("Workflow has nodes with missing fields or inputs. Please fix them before running.")
                confirmEvent();
                return null
            }

            ExecutionSessionSDK.actions.prepareForRun()

            const executionPromise = Orchestrator.API.run(api, {
                workflow,
                executionSession: ExecutionSessionSDK.state.session,
            });

            toast.promise(executionPromise, {
                loading: "Preparing workflow execution",
                error: (error) => {
                    const SystemError = error?.response?.data?.error;
                    const message = SystemError?.message || error.message;
                    return `Workflow execution failed to start: ${message}`
                }
            })

            try {
                const { success, jobId } = await executionPromise;

                if (!success || !jobId) {
                    toast.error("No worker available — execution failed to start")
                    confirmEvent();
                    return null;
                }

                sdk.subscribeToJob(jobId);

                sdk.setState(s => {
                    s.jobId = jobId
                    s.executionStatus = "running"
                })

                confirmEvent();
                return jobId;
            } catch {
                confirmEvent();
                return null;
            }
        },
        addAwaitedConfirmation: (event) => {
            sdk.setState(s => {
                s.awaitedConfirmation.add(event)
            })
        },
        removeAwaitedConfirmation: (event) => {
            sdk.setState(s => {
                s.awaitedConfirmation.delete(event)
            })
        },
        pause: async (jobId) => {
            sdk.actions.addAwaitedConfirmation("paused")

            const { success } = await Orchestrator.API.pause(api, { jobId });
            if (!success)
                toast.error("Failed to pause workflow")

            sdk.actions.removeAwaitedConfirmation("paused")
            return success;
        },
        terminate: async (jobId) => {
            sdk.actions.addAwaitedConfirmation("terminated")
            const { success } = await Orchestrator.API.terminate(api, { jobId });
            if (success)
                sdk.setState(s => s.jobId = undefined)
            else
                toast.error("Failed to terminate workflow")
            sdk.actions.removeAwaitedConfirmation("terminated")
            return success;
        },
        resume: async (jobId: Orchestrator.Job.Id) => {
            sdk.actions.addAwaitedConfirmation("resumed")

            const { success } = await Orchestrator.API.resume(api, { jobId });
            if (!success)
                toast.error("Failed to resume workflow")

            sdk.actions.removeAwaitedConfirmation("resumed")
            return success;
        },
        suspend: async (jobId: Orchestrator.Job.Id) => {
            sdk.actions.addAwaitedConfirmation("suspended")

            const { success } = await Orchestrator.API.suspend(api, { jobId });
            if (!success)
                toast.error("Failed to suspend workflow")

            sdk.actions.removeAwaitedConfirmation("suspended")
            return success;
        }
    } satisfies OrchestratorSDKActions
}

export type OrchestratorSDKActions = {
    addAwaitedConfirmation: (event: OrchestratorSDK.AwaitedConfirmation) => void,
    removeAwaitedConfirmation: (event: OrchestratorSDK.AwaitedConfirmation) => void,

    run: () => Promise<Orchestrator.Job.Id | null>,
    pause: (jobId: Orchestrator.Job.Id) => Promise<boolean>,
    terminate: (jobId: Orchestrator.Job.Id) => Promise<boolean>,
    resume: (jobId: Orchestrator.Job.Id) => Promise<boolean>,
    suspend: (jobId: Orchestrator.Job.Id) => Promise<boolean>,
}