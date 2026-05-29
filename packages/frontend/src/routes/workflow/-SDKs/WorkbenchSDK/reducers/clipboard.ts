import type { Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { nodeReducers } from "./node";
import { edgeReducers } from "./edge";

export const clipboardReducers = {
    copy: (s) => {
        s.clipboard.nodes.clear();
        s.clipboard.edges.clear();
        s.clipboard.layout = {}

        const selection = s.lastSelection;
        if (!selection)
            return

        const layout = s.data.ui.layout

        selection.nodes.forEach(nodeDriver => {
            const node = s.data.nodes[nodeDriver.id as Workflow.Node.Id];
            if (!node) {
                console.error(`Node ${nodeDriver.id} not found`)
                return
            }
            s.clipboard.nodes.add(node)
            s.clipboard.layout[node.id] = layout[node.id];
        })
        selection.edges.forEach(edgeDriver => {
            const edge = s.data.edges[edgeDriver.id as Workflow.Edge.Id];
            if (!edge) {
                console.error(`Edge ${edgeDriver.id} not found`)
                return
            }
            s.clipboard.edges.add(edge);
        })
    },
    paste: (s, mousePosToCanvas) => {

        const newNodeIds = new Map<Workflow.Node.Id, Workflow.Node.Id>()

        // 1. Calculate the bounding box top-left corner
        let minX = Infinity;
        let minY = Infinity;

        s.clipboard.nodes.forEach(node => {
            const pos = s.clipboard.layout[node.id];
            if (pos) {
                if (pos.x < minX) minX = pos.x;
                if (pos.y < minY) minY = pos.y;
            }
        });

        const hasValidBounds = minX !== Infinity && minY !== Infinity;

        // 2. Calculate the difference (offset) to move top-left to the mouse position
        let offsetX = 40;
        let offsetY = 40;

        if (mousePosToCanvas && hasValidBounds) {
            // we center the paste at the mouse by getting the distance from minX to mouseX
            offsetX = mousePosToCanvas.x - minX;
            offsetY = mousePosToCanvas.y - minY;
        }

        // 3. Duplicate nodes with calculated offsets maintaining relative alignment
        s.clipboard.nodes.forEach(node => {
            const originalPos = s.clipboard.layout[node.id];

            let targetPos = mousePosToCanvas;
            if (originalPos) {
                targetPos = {
                    x: originalPos.x + offsetX,
                    y: originalPos.y + offsetY
                };
            }

            const newNode = nodeReducers.duplicate(s, node, targetPos)
            newNodeIds.set(node.id, newNode.id)
        })

        s.clipboard.edges.forEach(edge => {
            const newSourceNodeId = newNodeIds.get(edge.source.nodeId)
            const newTargetNodeId = newNodeIds.get(edge.target.nodeId)
            if (!newSourceNodeId || !newTargetNodeId) {
                console.error(`Edge ${edge.id} not found`)
                return
            }
            edgeReducers.create(s, {
                source: newSourceNodeId,
                sourceHandle: edge.source.portId,
                target: newTargetNodeId,
                targetHandle: edge.target.portId
            })
        })

    },
    copyNode: (s, nodeId) => {
        s.clipboard.nodes.clear()
        s.clipboard.edges.clear()
        s.clipboard.layout = {}

        const node = s.data.nodes[nodeId];
        if (!node) {
            console.error(`Node ${nodeId} not found`)
            return
        }
        s.clipboard.nodes.add(node)
        s.clipboard.layout[node.id] = s.data.ui.layout[node.id];
    },
    clear: (s) => {
        s.clipboard.nodes.clear()
        s.clipboard.edges.clear()
        s.clipboard.layout = {}
    }
} satisfies ClipboardReducers

type ClipboardReducers = {
    copy: (state: WorkbenchSDK.State) => void
    copyNode: (state: WorkbenchSDK.State, node: Workflow.Node.Id) => void
    paste: (state: WorkbenchSDK.State, position?: { x: number, y: number }) => void
    clear: (state: WorkbenchSDK.State) => void
}
