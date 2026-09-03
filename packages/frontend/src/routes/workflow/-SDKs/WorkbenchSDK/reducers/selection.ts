import type { Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";

/** What the canvas selection resolves to. Ids only — the drivers stay on the editor side. */
export interface Selection {
    nodeIds: Workflow.Node.Id[]
    edgeIds: Workflow.Edge.Id[]
}

export const selectionReducers = {
    duplicate: (s, selection) => {
        const selectedNodeIds = new Set(selection.nodeIds);
        const newNodeIdMap = new Map<Workflow.Node.Id, Workflow.Node.Id>();

        selection.nodeIds.forEach(nodeId => {
            const node = s.data.nodes[nodeId];
            if (!node) return;
            const newNode = s.reducers.node.duplicate(s, node, undefined);
            newNodeIdMap.set(node.id, newNode.id);
        });

        selection.edgeIds.forEach(edgeId => {
            const edge = s.cache.edges[edgeId];
            if (!edge) return;
            if (!selectedNodeIds.has(edge.source.nodeId) || !selectedNodeIds.has(edge.target.nodeId)) return;

            const newSourceId = newNodeIdMap.get(edge.source.nodeId);
            const newTargetId = newNodeIdMap.get(edge.target.nodeId);
            if (!newSourceId || !newTargetId) return;

            s.reducers.edge.create(s, {
                source: newSourceId,
                sourceHandle: edge.source.portId,
                target: newTargetId,
                targetHandle: edge.target.portId,
            });
        });
    },
    delete: (s, selection) => {
        const selectedNodeIds = new Set(selection.nodeIds);

        selection.nodeIds.forEach(nodeId => {
            s.reducers.node.remove(s, nodeId);
        });

        // Remove selected edges whose endpoints weren't deleted via node removal
        selection.edgeIds.forEach(edgeId => {
            const edge = s.cache.edges[edgeId];
            if (!edge) return;
            if (!selectedNodeIds.has(edge.source.nodeId) && !selectedNodeIds.has(edge.target.nodeId)) {
                s.reducers.edge.remove(s, edgeId);
            }
        });
    },
    disable: (s, selection, isDisabled) => {
        selection.nodeIds.forEach(nodeId => {
            s.reducers.node.setDisabled(s, nodeId, isDisabled);
        });
    },
} satisfies SelectionReducers

interface SelectionReducers {
    duplicate : (state: WorkbenchSDK.State, selection: Selection) => void;
    delete    : (state: WorkbenchSDK.State, selection: Selection) => void;
    disable   : (state: WorkbenchSDK.State, selection: Selection, isDisabled: boolean) => void;
}
