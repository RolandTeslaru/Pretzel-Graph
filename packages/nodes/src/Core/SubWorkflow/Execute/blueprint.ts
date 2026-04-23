import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@vx-agent-editor/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.SubWorkflow.Execute",
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