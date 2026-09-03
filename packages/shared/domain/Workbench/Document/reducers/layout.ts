import type { Workflow } from "../../../Workflow";
import type { Document } from "../index";

export const layoutReducers: LayoutReducers = {
    node: {
        setPosition: (d, nodeId, newLayout) => {
            if (!newLayout)
                return

            // Ensure layout
            if(!d.data.ui.layout[nodeId]){
                d.data.ui.layout[nodeId] = { x: 0, y: 0 }
            }

            const oldNodeLayout = d.data.ui.layout[nodeId];

            // If same dont change
            if (newLayout.x === oldNodeLayout.x && newLayout.y === oldNodeLayout.y) {
                return
            }
            
            d.isDirty = true
            d.data.ui.layout[nodeId] = newLayout;
        },
        remove: (d, nodeId) => {
            d.isDirty = true;
            const layout = d.data.ui.layout;
            delete layout[nodeId];
        },
        add: (d, nodeId, position) => {
            d.isDirty = true;
            d.data.ui.layout[nodeId] = position;
        }
    },
    // Viewport is per-user view state: update the store but don't mark the workflow
    // dirty. The latest viewport still rides to the cloud inside `data` on the next edit.
    viewport: {
        setPosition: (d, position) => {
            const viewport = d.data.ui.viewport
            viewport.x = position.x;
            viewport.y = position.y;
        },
        setZoom: (d, zoom) => {
            const viewport = d.data.ui.viewport
            viewport.zoom = zoom;
        },
        set: (d, viewport) => {
            d.data.ui.viewport = viewport;
        }
    }
}


type LayoutReducers = {
    node: {
        setPosition: (document: Document, nodeId: Workflow.Node.Id, position: { x: number, y: number } | undefined) => void
        remove: (document: Document, nodeId: Workflow.Node.Id) => void
        add: (document: Document, nodeId: Workflow.Node.Id, position: { x: number, y: number }) => void
    },
    viewport: {
        setPosition: (document: Document, newLayout: { x: number, y: number }) => void
        setZoom: (document: Document, zoom: number) => void
        set: (document: Document, viewport: { x: number, y: number, zoom: number }) => void
    }
}