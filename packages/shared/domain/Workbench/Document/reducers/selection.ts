import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

/** What the canvas selection resolves to. Ids only — the drivers stay on the editor side. */
export interface Selection {
    nodeIds: Workflow.Node.Id[]
    edgeIds: Workflow.Edge.Id[]
}

export const selectionReducers: SelectionReducers = {
    duplicate: (d, selection) => {
        const selectedNodeIds = new Set(selection.nodeIds);
        const newNodeIdMap = new Map<Workflow.Node.Id, Workflow.Node.Id>();

        selection.nodeIds.forEach(nodeId => {
            const node = d.data.nodes[nodeId];
            if (!node) return;
            const newNode = d.reducers.node.duplicate(d, node, undefined);
            newNodeIdMap.set(node.id, newNode.id);
        });

        selection.edgeIds.forEach(edgeId => {
            const edge = d.cache.edges[edgeId];
            if (!edge) return;
            if (!selectedNodeIds.has(edge.source.nodeId) || !selectedNodeIds.has(edge.target.nodeId)) return;

            const newSourceId = newNodeIdMap.get(edge.source.nodeId);
            const newTargetId = newNodeIdMap.get(edge.target.nodeId);
            if (!newSourceId || !newTargetId) return;

            d.reducers.edge.create(d, {
                source: newSourceId,
                sourceHandle: edge.source.portId,
                target: newTargetId,
                targetHandle: edge.target.portId,
            });
        });
    },
    delete: (d, selection) => {
        const selectedNodeIds = new Set(selection.nodeIds);

        selection.nodeIds.forEach(nodeId => {
            d.reducers.node.remove(d, nodeId);
        });

        // Remove selected edges whose endpoints weren't deleted via node removal
        selection.edgeIds.forEach(edgeId => {
            const edge = d.cache.edges[edgeId];
            if (!edge) return;
            if (!selectedNodeIds.has(edge.source.nodeId) && !selectedNodeIds.has(edge.target.nodeId)) {
                d.reducers.edge.remove(d, edgeId);
            }
        });
    },
    disable: (d, selection, isDisabled) => {
        selection.nodeIds.forEach(nodeId => {
            d.reducers.node.setDisabled(d, nodeId, isDisabled);
        });
    },
}

export interface SelectionReducers {
    duplicate : (document: Document, selection: Selection) => void;
    delete    : (document: Document, selection: Selection) => void;
    disable   : (document: Document, selection: Selection, isDisabled: boolean) => void;
}
