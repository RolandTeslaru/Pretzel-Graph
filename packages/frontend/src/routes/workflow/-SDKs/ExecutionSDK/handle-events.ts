import type { Execution, Recording } from "@pretzel-graph/shared/domain";
import type { ExecutionSDKImpl } from "./sdk";
import { toast } from "sonner";

export const handleExecutionEvents = (sdk: ExecutionSDKImpl, e: Execution.Event | Recording.Event) => {
    console.log("Execution Session Event Received:", e.type)
    switch (e.type) {


        // Lifecycle events


        case "started":
            sdk.setState(s => {
                sdk.reducers.setStatus(s, "running");
            })
            break;
        case "completed":
            sdk.setState(s => {
                sdk.reducers.setSession(s, e.session);
                sdk.reducers.setStatus(s, "completed");
            })
            sdk.actions.removeAwaitedConfirmation("started");
            if (!sdk.state.isCurrentExecutionRecording)
                sdk.runtime.unsubscribeFromEvents?.();
            break;
        case "failed":
            sdk.setState(s => {
                sdk.reducers.setSession(s, e.session);
                sdk.reducers.setStatus(s, "failed");
                sdk.reducers.setError(s, e.error);
            })
            sdk.actions.removeAwaitedConfirmation("started");
            sdk.runtime.unsubscribeFromEvents?.();
            toast.error(`Execution failed: ${e.error.message}`)
            break;
        case "terminated":
            sdk.setState(s => {
                sdk.reducers.setStatus(s, "terminated");
            })
            sdk.actions.removeAwaitedConfirmation("terminated");
            if (!sdk.state.isCurrentExecutionRecording)
                sdk.runtime.unsubscribeFromEvents?.();
            break;
        case "paused":
            sdk.setState(s => {
                sdk.reducers.setSession(s, e.session);
                sdk.reducers.setStatus(s, "paused");
            })
            break;
        case "resumed":
            sdk.setState(s => {
                sdk.reducers.setSession(s, e.session);
                sdk.reducers.setStatus(s, "running");
            })
            break;
        case "suspended":
            sdk.setState(s => {
                sdk.reducers.setSession(s, e.session);
                sdk.reducers.setStatus(s, "suspended");
            })
            break;

        case "node:started":
            sdk.setState(s => {
                sdk.reducers.applySessionUpdate(s, e.sessionUpdate);
            })
            break;
        case "node:completed":
            sdk.setState(s => {
                sdk.reducers.applySessionUpdate(s, e.sessionUpdate);
            })
            break;
        case "node:waiting":
            sdk.setState(s => {
                sdk.reducers.applySessionUpdate(s, e.sessionUpdate);
            })
            break;
        case "node:error":
            sdk.setState(s => {
                sdk.reducers.applySessionUpdate(s, e.sessionUpdate);
            })
            break;
        case "update":
            sdk.setState(s => {
                sdk.reducers.applySessionUpdate(s, e.sessionUpdate);
            })
            break;

        
        // Recording related events


        case "unit:started":
            sdk.setState(s => {
                sdk.reducers.currentRecording.patchUnitStarted(s, e.unit)
            })
            break;
        case "unit:completed":
            sdk.setState(s => {
                sdk.reducers.currentRecording.patchUnitCompleted(s, e)
            })
            break;
        case "unit:failed":
            sdk.setState(s => {
                sdk.reducers.currentRecording.patchUnitFailed(s, e)
            })
            break;
        case "relation:createBatch":
            sdk.setState(s => {
                sdk.reducers.currentRecording.patchRelationCreateBatch(s, e)
            })
            break;
        case "recording:fullyUploaded":
            sdk.actions.loadLiveRecording(e.executionId)
            sdk.runtime.unsubscribeFromEvents?.();
            break;
        case "recording:completed":
            break;
        default:
            toast.error(`Received unknown event: ${e.type}`)
    }
}
