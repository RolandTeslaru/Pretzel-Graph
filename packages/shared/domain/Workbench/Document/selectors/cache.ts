import type { Workflow } from "../../../Workflow";
import type { Port } from "../../../Foundations/Port";
import type { Document } from "../index";

export interface CacheSelectors {
    getInputPortEdge:  (state: Document, nodeId: Workflow.Node.Id, inputId: Port.Input.Id) => Workflow.Edge.Id
    getOutputPortEdge: (state: Document, nodeId: Workflow.Node.Id, outputId: Port.Output.Id) => Workflow.Edge.Id
}

export const cacheSelectors: CacheSelectors = {
    getInputPortEdge: (s, nodeId, inputId) => s.cache.inputEdgesByPort[nodeId][inputId],
    getOutputPortEdge: (s, nodeId, outputId) => s.cache.outputEdgesByPort[nodeId][outputId],
}
