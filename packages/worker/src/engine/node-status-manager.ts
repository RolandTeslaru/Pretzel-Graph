import { Execution } from "@pretzel-graph/shared/domain";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";

type NodeStatus = Execution.Session.NodeStatus;

export class NodeStatusManager {
    handleStatusSet(
        session: Execution.Session,
        nodeId: Workflow.Node.Id,
        nodeStatus: NodeStatus,
    ): Execution.Session["node_status"] {
        return {
            [nodeId]: nodeStatus,
        };
    }
}
