import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";
import type { ClipboardPayload } from "../clipboard-payload";

export const clipboardReducers: ClipboardReducers = {
    pasteFromPayload: (s, payload, mousePosToCanvas) => {
        const newNodeIds = new Map<Workflow.Node.Id, Workflow.Node.Id>()

        // 1. Calculate the bounding box top-left corner
        let minX = Infinity;
        let minY = Infinity;

        payload.nodes.forEach(node => {
            const pos = payload.layout[node.id];
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

        // 3. Duplicate nodes with calculated offsets maintaining relative alignment.
        // Values come from the snapshot in the payload, not the live store.
        payload.nodes.forEach(node => {
            const originalPos = payload.layout[node.id];

            let targetPos = mousePosToCanvas;
            if (originalPos) {
                targetPos = {
                    x: originalPos.x + offsetX,
                    y: originalPos.y + offsetY
                };
            }

            const newNode = s.reducers.node.duplicate(s, node, targetPos, {
                staticValues:          payload.staticValues[node.id],
                fieldExpressions:      payload.fieldExpressions?.[node.id],
                credentialInstanceIds: payload.credentialInstanceIds[node.id],
            })
            newNodeIds.set(node.id, newNode.id)
        })

        payload.edges.forEach(edge => {
            const newSourceNodeId = newNodeIds.get(edge.source.nodeId)
            const newTargetNodeId = newNodeIds.get(edge.target.nodeId)
            if (!newSourceNodeId || !newTargetNodeId) {
                console.error(`Edge ${edge.id} not found`)
                return
            }
            s.reducers.edge.create(s, {
                source: newSourceNodeId,
                sourceHandle: edge.source.portId,
                target: newTargetNodeId,
                targetHandle: edge.target.portId
            })
        })
    },
}

type ClipboardReducers = {
    pasteFromPayload: (state: Document, payload: ClipboardPayload, position?: { x: number, y: number }) => void
}
