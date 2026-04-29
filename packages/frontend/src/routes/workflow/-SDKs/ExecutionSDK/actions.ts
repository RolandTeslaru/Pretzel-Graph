import { ExecutionSession, Orchestrator, Validation, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { type ExecutionSDKImpl } from "./sdk"
import { toast } from "sonner";
import type { DropFirstArg } from "@/SDKs/types";
import { ChatSDK } from "../ChatSDK/sdk";
import type { OrchestratorSDK } from "../OrchestratorSDK/sdk";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";

export const createExecutionSDKActions = (sdk: ExecutionSDKImpl) => {
    return {
        run: async () => {
            const confirmEvent = sdk.useAwaitConfirmation("started")

            if (sdk.state.jobId) {
                toast.warning("A workflow is already running")
                confirmEvent();
                return sdk.state.jobId
            }

            // Pre check before running the workflow
            WorkbenchSDK.actions.workflow.validate()
            if (Validation.workflowHasIssues(WorkbenchSDK.state.issues)) {
                toast.error("Workflow has nodes with missing fields or inputs. Please fix them before running.")
                confirmEvent();
                return null
            }

            const workflow = WorkbenchSDK.state.workflow;
            sdk.actions.createNewSession()

            const executionPromise = Orchestrator.API.run(api, {
                workflowId: workflow.id,
                workflowData: workflow.data,
                executionSession: sdk.state.session,
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

                sdk.setState(s => {
                    s.jobId = jobId
                    s.executionStatus = "running"
                })

                confirmEvent();

                Orchestrator.API.awaitResult(api, { jobId }).then(({ status, error }) => {
                    sdk.setState(s => {
                        s.jobId = undefined;
                        s.executionStatus = status;
                    })
                    if (status === 'completed') toast.success('Workflow completed successfully')
                    else if (status === 'failed') toast.error(`Workflow execution failed: ${error?.message} [${error?.code}]`)
                    else if (status === 'terminated') toast.error('Workflow execution terminated')
                }).catch(() => {
                    sdk.setState(s => { s.executionStatus = "failed" })
                    toast.error('Lost connection to workflow execution')
                })

                return jobId;
            } catch {
                confirmEvent();
                return null;
            }
        },
        pause: async (jobId) => {
            const confirmEvent = sdk.useAwaitConfirmation("paused")

            const { success } = await Orchestrator.API.pause(api, { jobId });
            if (success) {
                sdk.setState(s => { s.executionStatus = "paused" })
                toast.info('Workflow execution paused')
            } else {
                toast.error("Failed to pause workflow")
            }

            confirmEvent()
            return success;
        },
        terminate: async (jobId) => {
            const confirmEvent = sdk.useAwaitConfirmation("terminated")
            const { success } = await Orchestrator.API.terminate(api, { jobId });
            if (success)
                sdk.setState(s => s.jobId = undefined)
            else
                toast.error("Failed to terminate workflow")
            confirmEvent()
            return success;
        },
        resume: async (jobId: Orchestrator.Job.Id) => {
            const confirmEvent = sdk.useAwaitConfirmation("resumed")

            const { success } = await Orchestrator.API.resume(api, { jobId });
            if (success) {
                sdk.setState(s => { s.executionStatus = "running" })
                toast.info('Workflow execution resumed')
            } else {
                toast.error("Failed to resume workflow")
            }

            confirmEvent()
            return success;
        },
        suspend: async (jobId: Orchestrator.Job.Id) => {
            const confirmEvent = sdk.useAwaitConfirmation("suspended")

            const { success } = await Orchestrator.API.suspend(api, { jobId });
            if (!success)
                toast.error("Failed to suspend workflow")

            confirmEvent()
            return success;
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
        createNewSession: () => sdk.setState(s => {
            s.session = ExecutionSession.createInitial()
        }),
    } satisfies ExecutionSDKActions
}

export type ExecutionSDKActions = {

    run: () => Promise<Orchestrator.Job.Id | null>,
    pause: (jobId: Orchestrator.Job.Id) => Promise<boolean>,
    terminate: (jobId: Orchestrator.Job.Id) => Promise<boolean>,
    resume: (jobId: Orchestrator.Job.Id) => Promise<boolean>,
    suspend: (jobId: Orchestrator.Job.Id) => Promise<boolean>,

    addAwaitedConfirmation: (event: OrchestratorSDK.AwaitedConfirmation) => void,
    removeAwaitedConfirmation: (event: OrchestratorSDK.AwaitedConfirmation) => void,

    createNewSession: () => void
}
