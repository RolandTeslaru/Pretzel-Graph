import type { Execution } from "@pretzel-graph/shared/domain";
import type { ExecutionSDKImpl } from "./sdk";
import { toast } from "sonner";

export const handleExecutionEvents = (sdk: ExecutionSDKImpl, e: Execution.Event) => {
    console.log("Execution Session Event Received:", e.type)
    switch (e.type) {
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
                
                sdk.reducers.setNodeStatus(s, e.nodeId, {  status: "running", started_at: new Date().toISOString() })
            })
            break;
        case "node:completed":
            sdk.setState(s => {
                sdk.reducers.applySessionUpdate(s, e.sessionUpdate);
                sdk.reducers.setNodeOutput(s, e.nodeId, e.output);
                sdk.reducers.setNodeStatus(s, e.nodeId, { status: "completed", completed_at: new Date().toISOString() })
            })
            break;
        case "node:waiting":
            sdk.setState(s => {
                sdk.reducers.setNodeStatus(s, e.nodeId, { status: "waiting" })
            })
            break;
        case "node:error":
            sdk.setState(s => {
                sdk.reducers.setNodeStatus(s, e.nodeId, { status: "failed", error: e.error, completed_at: new Date().toISOString() })
            })
            break;
        case "update":
            sdk.setState(s => {
                sdk.reducers.applySessionUpdate(s, e.sessionUpdate);
            })
            break;
        default:
            // @ts-expect-error
            toast.error(`Received unknown event: ${e.type}`)
    }
}