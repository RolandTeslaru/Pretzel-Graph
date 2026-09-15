import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.DependencyReader",
    displayName: "Dependency Reader",
    description: "Reads the embedded workflow or skill a dependency field points at and outputs what it contains.",
    icon: "Graph",
    accent: "utility",
    fields: [
        defineField.Dependency("dependency", "Dependency", {
            acceptsKind: ["draftWorkflow", "publishedWorkflow", "listing", "skill"],
            required: true,
        }),
    ],
    inputs: [
        defineInput.Unresolved("trigger", "Trigger", {
            required: false,
            tooltip: "Optional trigger to run this node.",
            polymorphicGroupId: "signal"
        }),
    ],
    outputs: [
        defineOutput.Data("snapshot", "Snapshot", {
            tooltip: "What the embedded dependency contains: a workflow's name, version and node count, or a skill's name and content size."
        }),
    ],
});
