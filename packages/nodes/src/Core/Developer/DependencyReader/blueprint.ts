import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.DependencyReader",
    displayName: "Dependency Reader",
    description: "Reads the embedded workflow a dependency field points at and outputs what it contains.",
    icon: "Graph",
    accent: "utility",
    fields: [
        defineField.Dependency("dependency", "Workflow", {
            acceptsKind: ["draftWorkflow", "publishedWorkflow", "listing"],
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
            tooltip: "The embedded workflow's kind, id, name, version and node count."
        }),
    ],
});
