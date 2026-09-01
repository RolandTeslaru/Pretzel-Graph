import type { Workflow } from '@pretzel-graph/shared/domain';
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { WorkbenchSDK } from "../sdk";

export interface CacheSelectors {
    getInputPortEdge:  (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Workflow.Edge.Id
    getOutputPortEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => Workflow.Edge.Id
}

export const cacheSelectors = {
    getInputPortEdge: (s, nodeId, inputId) => s.cache.inputEdgesByPort[nodeId][inputId],
    getOutputPortEdge: (s, nodeId, outputId) => s.cache.outputEdgesByPort[nodeId][outputId],
} satisfies CacheSelectors
