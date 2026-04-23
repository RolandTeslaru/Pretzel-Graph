import type { Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { nodeReducers } from "./node";
import { edgeReducers } from "./edge";

export const selectionReducers = {
    duplicate: (s) => {
        const selection = s.lastSelection;
        if (!selection) return;

        const selectedNodeIds = new Set(selection.nodes.map(n => n.id as Workflow.Node.Id));
        const newNodeIdMap = new Map<Workflow.Node.Id, Workflow.Node.Id>();

        selection.nodes.forEach(nodeDriver => {
            const node = s.workflow.data.nodes[nodeDriver.id as Workflow.Node.Id];
            if (!node) return;
            const newNode = nodeReducers.duplicate(s, node, undefined);
            newNodeIdMap.set(node.id, newNode.id);
        });

        selection.edges.forEach(edgeDriver => {
            const edge = s.workflow.data.edges[edgeDriver.id as Workflow.Edge.Id];
            if (!edge) return;
            if (!selectedNodeIds.has(edge.source.nodeId) || !selectedNodeIds.has(edge.target.nodeId)) return;

            const newSourceId = newNodeIdMap.get(edge.source.nodeId);
            const newTargetId = newNodeIdMap.get(edge.target.nodeId);
            if (!newSourceId || !newTargetId) return;

            edgeReducers.create(s, {
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
            nodeReducers.remove(s, nodeDriver.id as Workflow.Node.Id);
        });

        // Remove selected edges whose endpoints weren't deleted via node removal
        selection.edges.forEach(edgeDriver => {
            const edge = s.workflow.data.edges[edgeDriver.id as Workflow.Edge.Id];
            if (!edge) return;
            if (!selectedNodeIds.has(edge.source.nodeId) && !selectedNodeIds.has(edge.target.nodeId)) {
                edgeReducers.remove(s, edgeDriver.id as Workflow.Edge.Id);
            }
        });
    },
    disable: (s, isDisabled) => {
        const selection = s.lastSelection;
        if (!selection) return;

        selection.nodes.forEach(nodeDriver => {
            nodeReducers.setDisabled(s, nodeDriver.id as Workflow.Node.Id, isDisabled);
        });
    },
} satisfies SelectionReducers

interface SelectionReducers {
    duplicate : (state: WorkbenchSDK.State) => void;
    delete    : (state: WorkbenchSDK.State) => void;
    disable   : (state: WorkbenchSDK.State, isDisabled: boolean) => void;
}
