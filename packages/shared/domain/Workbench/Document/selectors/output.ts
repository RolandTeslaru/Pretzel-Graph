import type { Workflow } from "../../../Workflow";
import type { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { nodeSelectors } from './node';

export interface OutputSelectors {
    get:     (document: Document, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => Port.Output | null
    hasEdge: (document: Document, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => boolean
}

export const outputSelectors: OutputSelectors = {
    get: (d, nodeId, outputId) => {
        const node = d.data.nodes[nodeId]
        if (!node) return null;

        const outputs = nodeSelectors.getOutputs(d, nodeId);

        return outputs.find(o => o.id === outputId) ?? null;
    },
    hasEdge: (d, nodeId, outputId) => !!d.cache.outputEdgesByPort[nodeId][outputId],
}
