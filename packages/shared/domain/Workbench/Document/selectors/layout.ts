import type { Document } from "../index";
import type { Workflow } from "../../../Workflow";

type NodeId = Workflow.Node.Id
type NodeLayout = { x: number; y: number }

export const layoutSelectors: LayoutSelectors = {
    node: {
        get: (d: Document, nodeId: NodeId): NodeLayout | undefined => d.data.ui.layout[nodeId],
    },
    viewport: {
        get: (d: Document): Workflow.Viewport => d.data.ui.viewport,
    },
}


export interface LayoutSelectors {
    node: {
        get: (document: Document, nodeId: NodeId) => NodeLayout | undefined
    }
    viewport: {
        get: (document: Document) => Workflow.Viewport
    }
}
