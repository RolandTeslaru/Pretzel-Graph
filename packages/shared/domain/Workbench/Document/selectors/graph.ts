import type { Workflow } from '@pretzel-graph/shared/domain';
import type { WorkbenchSDK } from "../sdk";

export interface GraphSelectors {
    hasArcBetween: (state: WorkbenchSDK.State, sourceNodeId: Workflow.Node.Id, targetNodeId: Workflow.Node.Id) => boolean
}

export const graphSelectors = {
    hasArcBetween: (s, sourceNodeId, targetNodeId) => {
        const outgoingEdges = s.cache.outgoingEdgesMap[sourceNodeId];
        if (!outgoingEdges) return false;
        return !!outgoingEdges[targetNodeId];
    }
} satisfies GraphSelectors
