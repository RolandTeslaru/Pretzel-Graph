import { defineBlueprint } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.SubWorkflow.Execute",
    displayName: "Execute Sub-Workflow",
    description: "Executes a saved sub-workflow and returns its output.",
    icon: "Graph",
    accent: "utility",
    fields: [],
    inputs: [


    ],
    outputs: [
    ],
    flags: {
        SHOW_DEPENDENCY_SELECTOR: true,
    },
});