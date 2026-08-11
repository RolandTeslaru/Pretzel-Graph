import { Consultation, Execution, Validation, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { ExecutionSDK, type ExecutionSDKImpl } from "./sdk"
import { toast } from "sonner";
import { WorkbenchSDK } from "../WorkbenchSDK/sdk";
import type { DropFirstArg } from "@/SDKs/types";

export const createExecutionSDKActions = (sdk: ExecutionSDKImpl) => {

    const run = async (igniter: Execution.Igniter): Promise<Execution.Id | null> => {
        const confirmStartedEvent = sdk.useAwaitConfirmation("started")

        // Check if there's already a running or paused execution. If so, we don't allow starting a new one.
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
        sdk._subscribeToExecutionChannel(executionId);

        igniter.record = sdk.state.igniterAttributes.record;
        igniter.debug = sdk.state.igniterAttributes.debug;
        igniter.chat_id = sdk.chatSDK.state.currentChatId ?? undefined;

        // Seed a stub currentExecution so events arriving before the HTTP
        // response have somewhere to land. The real Execution replaces it
        // once the run API resolves.
        const now = new Date().toISOString();
        sdk.setState(s => {
            s.currentExecution = {
                id: executionId,
                workflow_id: WorkbenchSDK.state.workflowId,
                igniter,
                status: "pending",
                duration: 0,
                session: Execution.Session.createInitial(),
                recording: null,
                created_at: now,
                updated_at: now,
            };
            sdk.reducers.timeline.reset(s);
        });

        const executionCreationPromise = Execution.API.run(api, {
            workflowId: WorkbenchSDK.state.workflowId,
            workflowData: WorkbenchSDK.state.data,
            executionId,
            igniter,
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
    }

    const actions = {
        run,
        pause: async () => {
            const executionId = sdk.state.currentExecution?.id;
            if (!executionId)
                return false;

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
        terminate: async () => {
            const executionId = sdk.state.currentExecution?.id;
            if (!executionId)
                return false;

            const confirmEvent = sdk.useAwaitConfirmation("terminated")
            const { success } = await Execution.API.terminate(api, { executionId });
            if (success) {
                sdk.setState(s => { sdk.reducers.currentExecution.setStatus(s, "terminated") })
                toast.info('Workflow execution terminated')
            }
            else
                toast.error("Failed to terminate workflow")
            confirmEvent()
            return success;
        },
        resume: async () => {
            const executionId = sdk.state.currentExecution?.id;
            if (!executionId)
                return false;

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
        suspend: async () => {
            const executionId = sdk.state.currentExecution?.id;
            if (!executionId)
                return false;

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
            sdk.setState(s => {
                sdk.reducers.currentExecution.set(s, execution);
                sdk.reducers.timeline.rebuild(s);
            });
        },
        loadHistory: async (workflowId: Workflow.Id) => {
            const { executions } = await Execution.API.Meta.list(api, { workflowId });
            sdk.setState(s => { s.executionHistory = executions });
            return executions;
        },
        clear: () => {
            sdk.setState(s => {
                s.currentExecution = undefined;
                s.executionHistory = [];
                s.igniterAttributes = { record: false, debug: false }
                sdk.reducers.timeline.reset(s);
            })
        },
        addAwaitedConfirmation: (event) => {
            sdk.setState(s => { sdk.reducers.awaitedConfirmation.add(s, event) })
        },
        removeAwaitedConfirmation: (event) => {
            sdk.setState(s => { sdk.reducers.awaitedConfirmation.remove(s, event) })
        },
        loadLiveRecording: async (executionId) => {
            try {
                const { recording } = await Execution.API.Recording.getLive(api, { executionId });
                sdk.setState(s => {
                    sdk.reducers.currentExecution.recording.set(s, recording);
                    sdk.reducers.timeline.rebuild(s);
                });
            } catch {
                sdk.setState(s => {
                    sdk.reducers.currentExecution.recording.set(s, null);
                    sdk.reducers.timeline.rebuild(s);
                });
            }
        },
        pendingConsultations: {
            add:    (request)        => { sdk.setState(s => { sdk.reducers.currentExecution.pendingConsultations.add(s, request) }) },
            remove: (consultationId) => { sdk.setState(s => { sdk.reducers.currentExecution.pendingConsultations.remove(s, consultationId) }) },
            clear:  ()               => { sdk.setState(s => { sdk.reducers.currentExecution.pendingConsultations.clear(s) }) },

            // User → engine. The route only returns once the worker has consumed the answer
            // and un-parked, so success means the card is genuinely done. Dropping it here is
            // an optimistic head start on the patch that clears it anyway.
            respond: async (consultationId, resolution) => {
                const executionId = sdk.state.currentExecution?.id;

                if (!executionId) return false;

                try {
                    const { success } = await Consultation.API.humanResponded(api, {
                        executionId,
                        consultationId,
                        resolution,
                    });

                    if (success)
                        sdk.actions.pendingConsultations.remove(consultationId);
                    else
                        toast.error("Response was not consumed by the engine");

                    return success;
                } catch {
                    toast.error("Failed to submit response");
                    return false;
                }
            },
        },
        igniter: {
            setShouldRecord: (record) => { sdk.setState(s => { sdk.reducers.igniter.setShouldRecord(s, record) }) },
            setShouldDebug: (debug) => { sdk.setState(s => { sdk.reducers.igniter.setShouldDebug(s, debug) }) }
        },
        timeline: {
            setZoom:        (zoom) => { sdk.setState(s => { sdk.reducers.timeline.setZoom(s, zoom) }) },
            setViewMode:    (mode) => { sdk.setState(s => { sdk.reducers.timeline.setViewMode(s, mode) }) },
            toggleViewMode: ()     => { sdk.setState(s => { sdk.reducers.timeline.toggleViewMode(s) }) },
            toggleRemnants: ()     => { sdk.setState(s => { sdk.reducers.timeline.toggleRemnants(s) }) },
            selectUoW:      (id)   => { sdk.setState(s => { sdk.reducers.timeline.selectUoW(s, id) }) },
        },
        runStep: (targetNodeId: Workflow.Node.Id) => run({ variant: "workbench_step", targetNodeId, record: false }),
        runFromIgniteableNode: (nodeId: Workflow.Node.Id) => run({ variant: "workbench_igniter", nodeId }),
    } satisfies ExecutionSDKActions

    return actions;
}

export type ExecutionSDKActions = {

    run: (igniter: Execution.Igniter) => Promise<Execution.Id | null>,
    runStep: (targetNodeId: Workflow.Node.Id) => Promise<Execution.Id | null>,
    runFromIgniteableNode: (nodeId: Workflow.Node.Id) => Promise<Execution.Id | null>,
    setCurrentExecution: (execution: Execution) => void,
    loadHistory: (workflowId: Workflow.Id) => Promise<Execution.Meta[]>,
    clear: () => void,
    // Act on the current execution, read at call time — there is never another one to target.
    pause: () => Promise<boolean>,
    terminate: () => Promise<boolean>,
    resume: () => Promise<boolean>,
    suspend: () => Promise<boolean>,

    addAwaitedConfirmation: (event: ExecutionSDK.AwaitedConfirmation) => void,
    removeAwaitedConfirmation: (event: ExecutionSDK.AwaitedConfirmation) => void,

    loadLiveRecording: (executionId: Execution.Id) => Promise<void>,

    pendingConsultations: {
        add:     DropFirstArg<ExecutionSDK.Reducers["currentExecution"]["pendingConsultations"]["add"]>,
        remove:  DropFirstArg<ExecutionSDK.Reducers["currentExecution"]["pendingConsultations"]["remove"]>,
        clear:   DropFirstArg<ExecutionSDK.Reducers["currentExecution"]["pendingConsultations"]["clear"]>,
        respond: <R extends Consultation.Resolution>(consultationId: Consultation.Id, resolution: R) => Promise<boolean>,
    },

    igniter: {
        setShouldRecord: DropFirstArg<ExecutionSDK.Reducers["igniter"]["setShouldRecord"]>,
        setShouldDebug: DropFirstArg<ExecutionSDK.Reducers["igniter"]["setShouldDebug"]>,
    },

    timeline: {
        setZoom:        DropFirstArg<ExecutionSDK.Reducers["timeline"]["setZoom"]>,
        setViewMode:    DropFirstArg<ExecutionSDK.Reducers["timeline"]["setViewMode"]>,
        toggleViewMode: DropFirstArg<ExecutionSDK.Reducers["timeline"]["toggleViewMode"]>,
        toggleRemnants: DropFirstArg<ExecutionSDK.Reducers["timeline"]["toggleRemnants"]>,
        selectUoW:      DropFirstArg<ExecutionSDK.Reducers["timeline"]["selectUoW"]>,
    }
}
