import { Workflow } from "@vx-agent-builder/shared/types";

export const EMPTY_WORKFLOW: Workflow = {
    id: "" as Workflow.Id,
    locked: false,
    display_name: "",
    description: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
        nodes: {},
        edges: {},
        fieldValues: {},
        ui: {
            layout: {},
            viewport: { x: 0, y: 0, zoom: 1 },
            icon: null,
            icon_color: null,
        }
    }
}