import type { Document } from "../index";
import type { Workflow } from "../../../Workflow";

type S      = Document
type NodeId = Workflow.Node.Id
type NodeLayout = { x: number; y: number }

export const layoutSelectors: LayoutSelectors = {
    node: {
        get: (s: S, nodeId: NodeId): NodeLayout | undefined => s.data.ui.layout[nodeId],
    },
    viewport: {
        get: (s: S): Workflow.Viewport => s.data.ui.viewport,
    },
}


export interface LayoutSelectors {
    node: {
        get: (s: S, nodeId: NodeId) => NodeLayout | undefined
    }
    viewport: {
        get: (s: S) => Workflow.Viewport
    }
}
