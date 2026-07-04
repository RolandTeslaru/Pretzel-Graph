import type { Workflow } from '@pretzel-graph/shared/domain';
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { WorkbenchSDK } from "../sdk";
import { nodeSelectors } from './node';

export interface OutputSelectors {
    get:     (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => Port.Output | null
    hasEdge: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => boolean
}

export const outputSelectors = {
    get: (s, nodeId, outputId) => {
        const node = s.data.nodes[nodeId]
        if (!node) return null;

        const outputs = nodeSelectors.getOutputs(s, nodeId);

        return outputs.find(o => o.id === outputId) ?? null;
    },
    hasEdge: (s, nodeId, outputId) => !!s.cache.outputHandlesMap[nodeId][outputId],
} satisfies OutputSelectors
