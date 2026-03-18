import { toast } from "sonner";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import { Orchestrator, Validation } from "@vx-agent-editor/shared/domain";
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

            const workflow = WorkbenchSDK.state.workflow;
            const wfCache = WorkbenchSDK.state.cache;

            // Check if the workflow has issues
            const workflowIssues = Validation.Issue.checkWorkflow(workflow, wfCache);
            if (Object.entries(workflowIssues).length > 0) {
                toast.error("Workflow has nodes with missing fields or inputs. Please fix them before running.")
                confirmEvent();
                return null
            }

            ExecutionSessionSDK.actions.session.clearAllNodeStatuses();
            ExecutionSessionSDK.setState(s => {
                s.session.edge_state = {};
                s.session.node_outputs = {};
            });

            const executionPromise = Orchestrator.API.run(
                api,
                {
                    workflow,
                    executionSession: ExecutionSessionSDK.state.session
                }
            );

            toast.promise(executionPromise, {
                loading: "Preparing workflow execution",
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

            confirmEvent();
            return jobId;
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
            if(!success)
                toast.error("Failed to pause workflow")

            sdk.actions.removeAwaitedConfirmation("paused")
            return success;
        },
        terminate: async (jobId) => {
            sdk.actions.addAwaitedConfirmation("terminated")
            const { success } = await Orchestrator.API.terminate(api, { jobId });
            if(success)
                sdk.setState(s => s.jobId = undefined)
            else
                toast.error("Failed to terminate workflow")
            sdk.actions.removeAwaitedConfirmation("terminated")
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
}