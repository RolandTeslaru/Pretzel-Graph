import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export interface GraphSelectors {
    hasArcBetween: (state: Document, sourceNodeId: Workflow.Node.Id, targetNodeId: Workflow.Node.Id) => boolean
}

export const graphSelectors: GraphSelectors = {
    hasArcBetween: (s, sourceNodeId, targetNodeId) => {
        const outgoingEdges = s.cache.outgoingEdgesMap[sourceNodeId];
        if (!outgoingEdges) return false;
        return !!outgoingEdges[targetNodeId];
    }
}
