import type { Workflow } from '@pretzel-graph/shared/domain';
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { WorkbenchSDK } from "../sdk";

export interface CacheSelectors {
    getInputHandleEdge:  (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Workflow.Edge.Id
    getOutputHandleEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => Workflow.Edge.Id
}

export const cacheSelectors = {
    getInputHandleEdge: (s, nodeId, inputId) => s.cache.inputHandlesMap[nodeId][inputId],
    getOutputHandleEdge: (s, nodeId, outputId) => s.cache.outputHandlesMap[nodeId][outputId],
} satisfies CacheSelectors
