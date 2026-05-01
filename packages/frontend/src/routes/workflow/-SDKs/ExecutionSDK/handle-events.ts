import type { Execution } from "@pretzel-graph/shared/domain";
import type { ExecutionSDKImpl } from "./sdk";
import { toast } from "sonner";

export const handleExecutionEvents = (sdk: ExecutionSDKImpl, e: Execution.Event) => {
    console.log("Execution Session Event Received:", e.type)
    switch (e.type) {
        case "node:started":
            sdk.setState(s => {
                if (e.stateUpdate)
                    sdk.reducers.applyUpdate(s, e.stateUpdate);
                sdk.reducers.setNodeStatus(s, e.nodeId, { status: "running", started_at: new Date().toISOString() })
            })
            break;
        case "node:completed":
            sdk.setState(s => {
                s.currentExecution!.session.node_output_projections[e.nodeId] = e.output as any;
                if (e.stateUpdate)
                    sdk.reducers.applyUpdate(s, e.stateUpdate);
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
                sdk.reducers.applyUpdate(s, e.update);
            })
            break;
        default:
            toast.error(`Received unknown event: ${e.type}`)
    }
}