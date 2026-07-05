import type { Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export const selectionReducers = {
    duplicate: (s) => {
        const selection = s.lastSelection;
        if (!selection) return;

        const selectedNodeIds = new Set(selection.nodes.map(n => n.id as Workflow.Node.Id));
        const newNodeIdMap = new Map<Workflow.Node.Id, Workflow.Node.Id>();

        selection.nodes.forEach(nodeDriver => {
            const node = s.data.nodes[nodeDriver.id as Workflow.Node.Id];
            if (!node) return;
            const newNode = s.reducers.node.duplicate(s, node, undefined);
            newNodeIdMap.set(node.id, newNode.id);
        });

        selection.edges.forEach(edgeDriver => {
            const edge = s.cache.edges[edgeDriver.id as Workflow.Edge.Id];
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
    delete: (s) => {
        const selection = s.lastSelection;
        if (!selection) return;

        const selectedNodeIds = new Set(selection.nodes.map(n => n.id as Workflow.Node.Id));

        selection.nodes.forEach(nodeDriver => {
            s.reducers.node.remove(s, nodeDriver.id as Workflow.Node.Id);
        });

        // Remove selected edges whose endpoints weren't deleted via node removal
        selection.edges.forEach(edgeDriver => {
            const edge = s.cache.edges[edgeDriver.id as Workflow.Edge.Id];
            if (!edge) return;
            if (!selectedNodeIds.has(edge.source.nodeId) && !selectedNodeIds.has(edge.target.nodeId)) {
                s.reducers.edge.remove(s, edgeDriver.id as Workflow.Edge.Id);
            }
        });
    },
    disable: (s, isDisabled) => {
        const selection = s.lastSelection;
        if (!selection) return;

        selection.nodes.forEach(nodeDriver => {
            s.reducers.node.setDisabled(s, nodeDriver.id as Workflow.Node.Id, isDisabled);
        });
    },
} satisfies SelectionReducers

interface SelectionReducers {
    duplicate : (state: WorkbenchSDK.State) => void;
    delete    : (state: WorkbenchSDK.State) => void;
    disable   : (state: WorkbenchSDK.State, isDisabled: boolean) => void;
}
