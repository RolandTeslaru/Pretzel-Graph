import type { WorkbenchSDK } from "../sdk";
import type { Workflow } from "@pretzel-graph/shared/domain";

type S      = WorkbenchSDK.State
type NodeId = Workflow.Node.Id
type NodeLayout = { x: number; y: number }

export const layoutSelectors = {
    node: {
        get: (s: S, nodeId: NodeId): NodeLayout | undefined => s.data.ui.layout[nodeId],
    },
    viewport: {
        get: (s: S): Workflow.Viewport => s.data.ui.viewport,
    },
} satisfies LayoutSelectors


export interface LayoutSelectors {
    node: {
        get: (s: S, nodeId: NodeId) => NodeLayout | undefined
    }
    viewport: {
        get: (s: S) => Workflow.Viewport
    }
}
