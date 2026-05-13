import { Execution, Validation, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { ExecutionSDK, type ExecutionSDKImpl } from "./sdk"
import { toast } from "sonner";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import { ChatSDK } from "../ChatSDK/sdk";

export const createExecutionSDKActions = (sdk: ExecutionSDKImpl) => {
    return {
        run: async (igniter?: Execution.Igniter) => {
            const confirmStartedEvent = sdk.useAwaitConfirmation("started")

            if (sdk.state.currentExecution && ["running", "paused"].includes(sdk.state.currentExecution.status)) {
                toast.warning("A workflow is already running")
                confirmStartedEvent();
                return sdk.state.currentExecution.id;
            }

            // Pre check before running the workflow
            WorkbenchSDK.actions.workflow.validate()
            if (Validation.workflowHasIssues(WorkbenchSDK.state.issues)) {
                toast.error("Workflow has nodes with missing fields or inputs. Please fix them before running.")
                confirmStartedEvent();
                return null
            }

            // Generate the ID eagerly
            const executionId = Execution.createId();
            sdk.subscribeToEvents(executionId);

            const executionCreationPromise = Execution.API.run(api, {
                workflowId: WorkbenchSDK.state.workflowId,
                workflowData: WorkbenchSDK.state.data,
                executionId,
                igniter,
                chat_id: ChatSDK.state.currentChatId ?? undefined,
            });

            toast.promise(executionCreationPromise, {
                loading: "Preparing workflow execution",
                error: (error) => {
                    const SystemError = error?.response?.data?.error;
                    const message = SystemError?.message || error.message;
                    return `Workflow execution failed to start: ${message}`
                }
            })

            try {
                const { execution } = await executionCreationPromise;

                if (!execution) {
                    toast.error("No worker available, execution failed to start")
                    return null;
                }

                sdk.setState(s => {
                    s.currentExecution = { ...execution, status: "running" }
                })
                            
                return execution.id;
            } catch {
                return null;
            } finally {
                confirmStartedEvent();
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
                sdk.setState(s => { sdk.reducers.setStatus(s, "terminated") })
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
        setCurrentExecution: (execution: Execution) => {
            sdk.setState(s => { sdk.reducers.setCurrentExecution(s, execution) });
        },
        loadHistory: async (workflowId: Workflow.Id) => {
            const { executions } = await Execution.API.Meta.list(api, { workflowId });
            sdk.setState(s => { s.executionHistory = executions });
            return executions;
        },
        clear: () => {
            sdk.setState(s => { s.currentExecution = undefined })
        },
        clearHistory: () => {
            sdk.setState(s => { s.executionHistory = [] })
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

    run:                 (igniter?: Execution.Igniter) => Promise<Execution.Id | null>,
    setCurrentExecution: (execution: Execution) => void,
    loadHistory:         (workflowId: Workflow.Id) => Promise<Execution.Meta[]>,
    clearHistory:        () => void,
    clear: () => void,
    pause:     (executionId: Execution.Id) => Promise<boolean>,
    terminate: (executionId: Execution.Id) => Promise<boolean>,
    resume:    (executionId: Execution.Id) => Promise<boolean>,
    suspend:   (executionId: Execution.Id) => Promise<boolean>,

    addAwaitedConfirmation: (event: ExecutionSDK.AwaitedConfirmation) => void,
    removeAwaitedConfirmation: (event: ExecutionSDK.AwaitedConfirmation) => void,
}
