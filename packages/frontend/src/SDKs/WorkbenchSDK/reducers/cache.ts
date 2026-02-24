import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { workbenchSelectors } from "../selectors";

const sel = workbenchSelectors

export const cacheReducers = {
    deleteEdge: (s, { source, target }) => {
        const inNodes = sel.ensureInNodesCache(s, target.nodeId);
        delete inNodes[source.nodeId]

        const outNodes = sel.ensureOutNodesCache(s, source.nodeId);
        delete outNodes[target.nodeId]

        delete s.cache.inputHandlesMap[target.nodeId][target.portId];
        delete s.cache.outputHandlesMap[source.nodeId][source.portId]
    },
    addEdge: (s, { source, target, id: edgeId }) => {
        sel.ensureInNodesCache(s, target.nodeId)[source.nodeId] = edgeId;
        sel.ensureOutNodesCache(s, source.nodeId)[target.nodeId] = edgeId

        s.cache.inputHandlesMap[target.nodeId][target.portId] = edgeId
        s.cache.outputHandlesMap[source.nodeId][source.portId] = edgeId

        // Don't delete s.workflow.fieldValues[target.nodeId][target.portId] here
    },
    deleteNode: (s, deletedNodeId) => {
        delete s.cache.ingoersEdgesMap[deletedNodeId];
        delete s.cache.outgoersEdgesMap[deletedNodeId];

        delete s.cache.inputHandlesMap[deletedNodeId];
        delete s.cache.outputHandlesMap[deletedNodeId];
    },
    createNode: (s, newNode) => {
        const ingoerEdges = {}
        const outgoerEdges = {}
        s.cache.ingoersEdgesMap[newNode.id] = ingoerEdges
        s.cache.outgoersEdgesMap[newNode.id] = outgoerEdges

        s.cache.inputHandlesMap[newNode.id] = {}
        s.cache.outputHandlesMap[newNode.id] = {}
    },
    createAll: (_, wf) => {
        const outgoersEdgesMap: WorkbenchSDK.State["cache"]["outgoersEdgesMap"] = {};
        const ingoersEdgesMap:  WorkbenchSDK.State["cache"]["ingoersEdgesMap"] = {};
        const inputHandlesMap:  WorkbenchSDK.State["cache"]["inputHandlesMap"] = {};
        const outputHandlesMap: WorkbenchSDK.State["cache"]["outputHandlesMap"] = {};

        Object.values(wf.data.nodes).forEach(node => {
            outgoersEdgesMap[node.id] = {};
            ingoersEdgesMap[node.id] = {};
            inputHandlesMap[node.id] = {};
            outputHandlesMap[node.id] = {};
        })

        Object.values(wf.data.edges).forEach(edge => {
            const sourceNodeId = edge.source.nodeId;
            const targetNodeId = edge.target.nodeId;

            const sourceHandleId = edge.source.portId;
            const targetHandleId = edge.target.portId

            // Outgoers Edges Map
            outgoersEdgesMap[sourceNodeId][targetNodeId] = edge.id

            // Ingoers Edges Map
            ingoersEdgesMap[targetNodeId][sourceNodeId] = edge.id

            inputHandlesMap[targetNodeId][targetHandleId] = edge.id

            outputHandlesMap[sourceNodeId][sourceHandleId] = edge.id
        })

        return {
            outgoersEdgesMap,
            ingoersEdgesMap,
            inputHandlesMap,
            outputHandlesMap,
        }
    }
} satisfies INTERNAL_CacheReducers

type INTERNAL_CacheReducers = {
    deleteEdge: (state: WorkbenchSDK.State, edge: Workflow.Edge) => void
    addEdge: (state: WorkbenchSDK.State, newEdge: Workflow.Edge) => void
    deleteNode: (state: WorkbenchSDK.State, deletedNodeId: Workflow.Node.Id) => void
    createNode: (state: WorkbenchSDK.State, newNode: Workflow.Node) => void

    createAll: (state: WorkbenchSDK.State, workflow: Workflow) => WorkbenchSDK.State["cache"]
}