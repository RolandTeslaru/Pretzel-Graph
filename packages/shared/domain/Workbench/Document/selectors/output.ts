import type { Workflow } from "../../../Workflow";
import type { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { nodeSelectors } from './node';

export interface OutputSelectors {
    get:     (state: Document, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => Port.Output | null
    hasEdge: (state: Document, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => boolean
}

export const outputSelectors: OutputSelectors = {
    get: (s, nodeId, outputId) => {
        const node = s.data.nodes[nodeId]
        if (!node) return null;

        const outputs = nodeSelectors.getOutputs(s, nodeId);

        return outputs.find(o => o.id === outputId) ?? null;
    },
    hasEdge: (s, nodeId, outputId) => !!s.cache.outputEdgesByPort[nodeId][outputId],
}
