import { defineBlueprint, defineField } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

export const Blueprint = defineBlueprint({
    id: "Core.SubWorkflow.Execute",
    displayName: "Execute Sub-Workflow",
    description: "Executes a saved sub-workflow and returns its output.",
    icon: "Graph",
    accent: "utility",
    fields: [
        defineField.Dependency(Workflow.Node.SHAPE_DEPENDENCY_FIELD_ID, "Workflow", {
            acceptsKind: ["draftWorkflow", "publishedWorkflow", "listing"],
            required: true,
        }),
    ],
    inputs: [


    ],
    outputs: [
    ],
});
