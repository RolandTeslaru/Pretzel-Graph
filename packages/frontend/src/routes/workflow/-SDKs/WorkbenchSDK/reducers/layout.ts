import type { Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export const layoutReducers = {
    node: {
        setPosition: (s, nodeId, newLayout) => {
            if (!newLayout)
                return

            // Ensure layout
            if(!s.data.ui.layout[nodeId]){
                s.data.ui.layout[nodeId] = { x: 0, y: 0 }
            }

            const oldNodeLayout = s.data.ui.layout[nodeId];

            // If same dont change
            if (newLayout.x === oldNodeLayout.x && newLayout.y === oldNodeLayout.y) {
                return
            }
            
            s.isDirty = true
            s.data.ui.layout[nodeId] = newLayout;
        },
        remove: (s, nodeId) => {
            s.isDirty = true;
            const layout = s.data.ui.layout;
            delete layout[nodeId];
        },
        add: (s, nodeId, position) => {
            s.isDirty = true;
            s.data.ui.layout[nodeId] = position;
        }
    },
    viewport: {
        setPosition: (s, position) => {
            s.isDirty = true;
            const viewport = s.data.ui.viewport
            viewport.x = position.x;
            viewport.y = position.y;
        },
        setZoom: (s, zoom) => {
            s.isDirty = true;
            const viewport = s.data.ui.viewport
            viewport.zoom = zoom;
        },
        set: (s, viewport) => {
            s.isDirty = true;
            s.data.ui.viewport = viewport;
        }
    }
} satisfies LayoutReducers


type LayoutReducers = {
    node: {
        setPosition: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, position: { x: number, y: number } | undefined) => void
        remove: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => void
        add: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, position: { x: number, y: number }) => void
    },
    viewport: {
        setPosition: (state: WorkbenchSDK.State, newLayout: { x: number, y: number }) => void
        setZoom: (state: WorkbenchSDK.State, zoom: number) => void
        set: (state: WorkbenchSDK.State, viewport: { x: number, y: number, zoom: number }) => void
    }
}