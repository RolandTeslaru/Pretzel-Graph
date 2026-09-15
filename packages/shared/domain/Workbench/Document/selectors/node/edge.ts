import type { Workflow } from "../../../../Workflow";
import type { Document } from "../../index";

export interface NodeEdgeSelectors {
    getIncoming: (document: Document, nodeId: Workflow.Node.Id) => Workflow.Edge[]
    getOutgoing: (document: Document, nodeId: Workflow.Node.Id) => Workflow.Edge[]
}

export const nodeEdgeSelectors: NodeEdgeSelectors = {
    getIncoming: (d, nodeId) =>
        Object.values(d.cache.incomingEdgesMap[nodeId] ?? {}).map(edgeId => d.cache.edges[edgeId]),
    getOutgoing: (d, nodeId) =>
        Object.values(d.cache.outgoingEdgesMap[nodeId] ?? {}).map(edgeId => d.cache.edges[edgeId]),
}
