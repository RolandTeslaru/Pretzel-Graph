import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export const layoutReducers: LayoutReducers = {
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
    // Viewport is per-user view state: update the store but don't mark the workflow
    // dirty. The latest viewport still rides to the cloud inside `data` on the next edit.
    viewport: {
        setPosition: (s, position) => {
            const viewport = s.data.ui.viewport
            viewport.x = position.x;
            viewport.y = position.y;
        },
        setZoom: (s, zoom) => {
            const viewport = s.data.ui.viewport
            viewport.zoom = zoom;
        },
        set: (s, viewport) => {
            s.data.ui.viewport = viewport;
        }
    }
}


type LayoutReducers = {
    node: {
        setPosition: (state: Document, nodeId: Workflow.Node.Id, position: { x: number, y: number } | undefined) => void
        remove: (state: Document, nodeId: Workflow.Node.Id) => void
        add: (state: Document, nodeId: Workflow.Node.Id, position: { x: number, y: number }) => void
    },
    viewport: {
        setPosition: (state: Document, newLayout: { x: number, y: number }) => void
        setZoom: (state: Document, zoom: number) => void
        set: (state: Document, viewport: { x: number, y: number, zoom: number }) => void
    }
}