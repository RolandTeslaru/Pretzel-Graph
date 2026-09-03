import { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export const cacheReducers: INTERNAL_CacheReducers = {
    resolvedShape: {
        recreate: (s, nodeId) => {
            const node = s.data.nodes[nodeId];
            if (!node) {
                delete s.cache.resolvedShape[nodeId];
                return;
            }

            const blueprint = s.selectors.blueprint.ofNode(s, node);
            if (!blueprint) {
                delete s.cache.resolvedShape[nodeId];
                return;
            }

            s.cache.resolvedShape[nodeId] = Workflow.resolveShape(s.data, node, blueprint);
        },
        recreateAll: (s) => {
            s.cache.resolvedShape = {};
            for (const nodeId of Object.keys(s.data.nodes) as Workflow.Node.Id[])
                cacheReducers.resolvedShape.recreate(s, nodeId);
        },
    },
    ensureIncomingNodeEdges: (s, nodeId) => {
        if (!s.cache.incomingEdgesMap[nodeId])
            s.cache.incomingEdgesMap[nodeId] = {};

        return s.cache.incomingEdgesMap[nodeId];
    },
    ensureOutgoingNodeEdges: (s, nodeId) => {
        if (!s.cache.outgoingEdgesMap[nodeId])
            s.cache.outgoingEdgesMap[nodeId] = {};

        return s.cache.outgoingEdgesMap[nodeId];
    },
    deleteEdge: (s, { source, target, id: edgeId }) => {
        delete s.cache.edges[edgeId];

        const inNodes = cacheReducers.ensureIncomingNodeEdges(s, target.nodeId);
        delete inNodes[source.nodeId]

        const outNodes = cacheReducers.ensureOutgoingNodeEdges(s, source.nodeId);
        delete outNodes[target.nodeId]

        delete s.cache.inputEdgesByPort[target.nodeId][target.portId];
        delete s.cache.outputEdgesByPort[source.nodeId][source.portId]
    },
    addEdge: (s, newEdge) => {
        const { source, target, id: edgeId } = newEdge;
        s.cache.edges[edgeId] = newEdge;

        cacheReducers.ensureIncomingNodeEdges(s, target.nodeId)[source.nodeId] = edgeId;
        cacheReducers.ensureOutgoingNodeEdges(s, source.nodeId)[target.nodeId] = edgeId

        s.cache.inputEdgesByPort[target.nodeId][target.portId] = edgeId
        s.cache.outputEdgesByPort[source.nodeId][source.portId] = edgeId

        // Don't delete s.workflow.fieldValues[target.nodeId][target.portId] here
    },
    deleteNode: (s, deletedNodeId) => {
        delete s.cache.incomingEdgesMap[deletedNodeId];
        delete s.cache.outgoingEdgesMap[deletedNodeId];

        delete s.cache.inputEdgesByPort[deletedNodeId];
        delete s.cache.outputEdgesByPort[deletedNodeId];
        delete s.cache.resolvedShape[deletedNodeId];
    },
    createNode: (s, newNode) => {
        const ingoerEdges = {}
        const outgoerEdges = {}
        s.cache.incomingEdgesMap[newNode.id] = ingoerEdges
        s.cache.outgoingEdgesMap[newNode.id] = outgoerEdges

        s.cache.inputEdgesByPort[newNode.id] = {}
        s.cache.outputEdgesByPort[newNode.id] = {}
        cacheReducers.resolvedShape.recreate(s, newNode.id);
    }
}

type INTERNAL_CacheReducers = {
    resolvedShape: {
        recreate: (state: Document, nodeId: Workflow.Node.Id) => void
        recreateAll: (state: Document) => void
    }
    ensureIncomingNodeEdges: (state: Document, nodeId: Workflow.Node.Id) => Record<Workflow.Node.Id, Workflow.Edge.Id>
    ensureOutgoingNodeEdges: (state: Document, nodeId: Workflow.Node.Id) => Record<Workflow.Node.Id, Workflow.Edge.Id>
    deleteEdge: (state: Document, edge: Workflow.Edge) => void
    addEdge: (state: Document, newEdge: Workflow.Edge) => void
    deleteNode: (state: Document, deletedNodeId: Workflow.Node.Id) => void
    createNode: (state: Document, newNode: Workflow.Node.Raw) => void
}
