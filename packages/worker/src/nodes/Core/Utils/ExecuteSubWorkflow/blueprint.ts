import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.ExecuteSubWorkflow",
    displayName: "Execute Sub-Workflow",
    description: "Executes a saved sub-workflow and returns its output.",
    icon: "Graph",
    accent: "utility",
    fields: [
        FieldBuilder.String({
            id: "workflowId",
            displayName: "Sub-Workflow ID",
            placeholder: "workflow_...",
            tooltip: "The ID of the sub-workflow to execute",
            required: true,
        }),
    ],
    inputs: [],
    outputs: [],
});
