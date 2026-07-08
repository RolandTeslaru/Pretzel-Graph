import { Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export const cacheReducers = {
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

        delete s.cache.inputHandlesMap[target.nodeId][target.portId];
        delete s.cache.outputHandlesMap[source.nodeId][source.portId]
    },
    addEdge: (s, newEdge) => {
        const { source, target, id: edgeId } = newEdge;
        s.cache.edges[edgeId] = newEdge;

        cacheReducers.ensureIncomingNodeEdges(s, target.nodeId)[source.nodeId] = edgeId;
        cacheReducers.ensureOutgoingNodeEdges(s, source.nodeId)[target.nodeId] = edgeId

        s.cache.inputHandlesMap[target.nodeId][target.portId] = edgeId
        s.cache.outputHandlesMap[source.nodeId][source.portId] = edgeId

        // Don't delete s.workflow.fieldValues[target.nodeId][target.portId] here
    },
    deleteNode: (s, deletedNodeId) => {
        delete s.cache.incomingEdgesMap[deletedNodeId];
        delete s.cache.outgoingEdgesMap[deletedNodeId];

        delete s.cache.inputHandlesMap[deletedNodeId];
        delete s.cache.outputHandlesMap[deletedNodeId];
    },
    createNode: (s, newNode) => {
        const ingoerEdges = {}
        const outgoerEdges = {}
        s.cache.incomingEdgesMap[newNode.id] = ingoerEdges
        s.cache.outgoingEdgesMap[newNode.id] = outgoerEdges

        s.cache.inputHandlesMap[newNode.id] = {}
        s.cache.outputHandlesMap[newNode.id] = {}
    }
} satisfies INTERNAL_CacheReducers

type INTERNAL_CacheReducers = {
    ensureIncomingNodeEdges: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<Workflow.Node.Id, Workflow.Edge.Id>
    ensureOutgoingNodeEdges: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<Workflow.Node.Id, Workflow.Edge.Id>
    deleteEdge: (state: WorkbenchSDK.State, edge: Workflow.Edge) => void
    addEdge: (state: WorkbenchSDK.State, newEdge: Workflow.Edge) => void
    deleteNode: (state: WorkbenchSDK.State, deletedNodeId: Workflow.Node.Id) => void
    createNode: (state: WorkbenchSDK.State, newNode: Workflow.Node.Raw) => void
}
