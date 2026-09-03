import type { Workflow } from "../../../Workflow";
import type { Port } from "../../../Foundations/Port";
import type { Document } from "../index";

export interface CacheSelectors {
    getInputPortEdge:  (document: Document, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Workflow.Edge.Id
    getOutputPortEdge: (document: Document, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => Workflow.Edge.Id
}

export const cacheSelectors: CacheSelectors = {
    getInputPortEdge: (d, nodeId, inputId) => d.cache.inputEdgesByPort[nodeId][inputId],
    getOutputPortEdge: (d, nodeId, outputId) => d.cache.outputEdgesByPort[nodeId][outputId],
}
