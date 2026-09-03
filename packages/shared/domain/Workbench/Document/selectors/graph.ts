import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface GraphSelectors {
    hasArcBetween: (document: Document, sourceNodeId: Workflow.Node.Id, targetNodeId: Workflow.Node.Id) => boolean
}

export const graphSelectors: GraphSelectors = {
    hasArcBetween: (d, sourceNodeId, targetNodeId) => {
        const outgoingEdges = d.cache.outgoingEdgesMap[sourceNodeId];
        if (!outgoingEdges) return false;
        return !!outgoingEdges[targetNodeId];
    }
}
