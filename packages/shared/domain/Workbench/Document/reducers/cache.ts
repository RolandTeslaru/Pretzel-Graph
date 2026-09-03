import { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export const cacheReducers: INTERNAL_CacheReducers = {
    resolvedShape: {
        recreate: (d, nodeId) => {
            const node = d.data.nodes[nodeId];
            if (!node) {
                delete d.cache.resolvedShape[nodeId];
                return;
            }

            const blueprint = d.selectors.blueprint.ofNode(d, node);
            if (!blueprint) {
                delete d.cache.resolvedShape[nodeId];
                return;
            }

            d.cache.resolvedShape[nodeId] = Workflow.resolveShape(d.data, node, blueprint);
        },
        recreateAll: (d) => {
            d.cache.resolvedShape = {};
            for (const nodeId of Object.keys(d.data.nodes) as Workflow.Node.Id[])
                cacheReducers.resolvedShape.recreate(d, nodeId);
        },
    },
    ensureIncomingNodeEdges: (d, nodeId) => {
        if (!d.cache.incomingEdgesMap[nodeId])
            d.cache.incomingEdgesMap[nodeId] = {};

        return d.cache.incomingEdgesMap[nodeId];
    },
    ensureOutgoingNodeEdges: (d, nodeId) => {
        if (!d.cache.outgoingEdgesMap[nodeId])
            d.cache.outgoingEdgesMap[nodeId] = {};

        return d.cache.outgoingEdgesMap[nodeId];
    },
    deleteEdge: (d, { source, target, id: edgeId }) => {
        delete d.cache.edges[edgeId];

        const inNodes = cacheReducers.ensureIncomingNodeEdges(d, target.nodeId);
        delete inNodes[source.nodeId]

        const outNodes = cacheReducers.ensureOutgoingNodeEdges(d, source.nodeId);
        delete outNodes[target.nodeId]

        delete d.cache.inputEdgesByPort[target.nodeId][target.portId];
        delete d.cache.outputEdgesByPort[source.nodeId][source.portId]
    },
    addEdge: (d, newEdge) => {
        const { source, target, id: edgeId } = newEdge;
        d.cache.edges[edgeId] = newEdge;

        cacheReducers.ensureIncomingNodeEdges(d, target.nodeId)[source.nodeId] = edgeId;
        cacheReducers.ensureOutgoingNodeEdges(d, source.nodeId)[target.nodeId] = edgeId

        d.cache.inputEdgesByPort[target.nodeId][target.portId] = edgeId
        d.cache.outputEdgesByPort[source.nodeId][source.portId] = edgeId

        // Don't delete d.workflow.fieldValues[target.nodeId][target.portId] here
    },
    deleteNode: (d, deletedNodeId) => {
        delete d.cache.incomingEdgesMap[deletedNodeId];
        delete d.cache.outgoingEdgesMap[deletedNodeId];

        delete d.cache.inputEdgesByPort[deletedNodeId];
        delete d.cache.outputEdgesByPort[deletedNodeId];
        delete d.cache.resolvedShape[deletedNodeId];
    },
    createNode: (d, newNode) => {
        const ingoerEdges = {}
        const outgoerEdges = {}
        d.cache.incomingEdgesMap[newNode.id] = ingoerEdges
        d.cache.outgoingEdgesMap[newNode.id] = outgoerEdges

        d.cache.inputEdgesByPort[newNode.id] = {}
        d.cache.outputEdgesByPort[newNode.id] = {}
        cacheReducers.resolvedShape.recreate(d, newNode.id);
    }
}

type INTERNAL_CacheReducers = {
    resolvedShape: {
        recreate: (document: Document, nodeId: Workflow.Node.Id) => void
        recreateAll: (document: Document) => void
    }
    ensureIncomingNodeEdges: (document: Document, nodeId: Workflow.Node.Id) => Record<Workflow.Node.Id, Workflow.Edge.Id>
    ensureOutgoingNodeEdges: (document: Document, nodeId: Workflow.Node.Id) => Record<Workflow.Node.Id, Workflow.Edge.Id>
    deleteEdge: (document: Document, edge: Workflow.Edge) => void
    addEdge: (document: Document, newEdge: Workflow.Edge) => void
    deleteNode: (document: Document, deletedNodeId: Workflow.Node.Id) => void
    createNode: (document: Document, newNode: Workflow.Node.Raw) => void
}
