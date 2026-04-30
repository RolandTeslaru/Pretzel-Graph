import { Execution, Validation } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { ExecutionSDK, type ExecutionSDKImpl } from "./sdk"
import { toast } from "sonner";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";

export const createExecutionSDKActions = (sdk: ExecutionSDKImpl) => {
    return {
        run: async () => {
            const confirmEvent = sdk.useAwaitConfirmation("started")

            if (sdk.state.currentExecution) {
                toast.warning("A workflow is already running")
                confirmEvent();
                return sdk.state.currentExecution.id;
            }

            // Pre check before running the workflow
            WorkbenchSDK.actions.workflow.validate()
            if (Validation.workflowHasIssues(WorkbenchSDK.state.issues)) {
                toast.error("Workflow has nodes with missing fields or inputs. Please fix them before running.")
                confirmEvent();
                return null
            }

            const workflow = WorkbenchSDK.state.workflow;

            const executionPromise = Execution.API.run(api, {
                workflowId: workflow.id,
                workflowData: workflow.data,
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
                const { execution } = await executionPromise;

                if (!execution) {
                    toast.error("No worker available — execution failed to start")
                    confirmEvent();
                    return null;
                }

                sdk.setState(s => {
                    s.currentExecution = execution
                })

                confirmEvent();

                Execution.API.awaitResult(api, { executionId: execution.id }).then(({ status, error }) => {
                    sdk.setState(s => {
                        s.currentExecution!.status = status
                    })
                    if (status === 'completed') toast.success('Workflow completed successfully')
                    else if (status === 'failed') toast.error(`Workflow execution failed: ${error?.message} [${error?.code}]`)
                    else if (status === 'terminated') toast.error('Workflow execution terminated')
                }).catch(() => {
                    sdk.setState(s => { s.currentExecution!.status = "failed" })
                    toast.error('Lost connection to workflow execution')
                })

                return execution.id;
            } catch {
                confirmEvent();
                return null;
            }
        },
        pause: async (executionId) => {
            const confirmEvent = sdk.useAwaitConfirmation("paused")

            const { success } = await Execution.API.pause(api, { executionId });
            if (success) {
                sdk.setState(s => { s.currentExecution!.status = "paused" })
                toast.info('Workflow execution paused')
            } else {
                toast.error("Failed to pause workflow")
            }

            confirmEvent()
            return success;
        },
        terminate: async (executionId) => {
            const confirmEvent = sdk.useAwaitConfirmation("terminated")
            const { success } = await Execution.API.terminate(api, { executionId });
            if (success){
                sdk.setState(s => s.currentExecution = undefined)
                toast.info('Workflow execution terminated')
            }
            else
                toast.error("Failed to terminate workflow")
            confirmEvent()
            return success;
        },
        resume: async (executionId: Execution.Id) => {
            const confirmEvent = sdk.useAwaitConfirmation("resumed")

            const { success } = await Execution.API.resume(api, { executionId });
            if (success) {
                sdk.setState(s => { s.currentExecution!.status = "running" })
                toast.info('Workflow execution resumed')
            } else {
                toast.error("Failed to resume workflow")
            }

            confirmEvent()
            return success;
        },
        suspend: async (executionId: Execution.Id) => {
            const confirmEvent = sdk.useAwaitConfirmation("suspended")

            const { success } = await Execution.API.suspend(api, { executionId });
            if (!success)
                toast.error("Failed to suspend workflow")

            sdk.setState(s => {
                if (success)
                    s.currentExecution!.status = "suspended"
            })

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
    } satisfies ExecutionSDKActions
}

export type ExecutionSDKActions = {

    run: () => Promise<Execution.Id | null>,
    pause:     (executionId: Execution.Id) => Promise<boolean>,
    terminate: (executionId: Execution.Id) => Promise<boolean>,
    resume:    (executionId: Execution.Id) => Promise<boolean>,
    suspend:   (executionId: Execution.Id) => Promise<boolean>,

    addAwaitedConfirmation: (event: ExecutionSDK.AwaitedConfirmation) => void,
    removeAwaitedConfirmation: (event: ExecutionSDK.AwaitedConfirmation) => void,
}
