import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.DependencyFieldTest",
    displayName: "Dependency Field Test",
    description: "One dependency field for each combination of accepted kinds. Outputs the reference each field holds.",
    icon: "Graph",
    accent: "utility",
    fields: [
        defineField.Dependency("anyWorkflow", "Any Workflow", {
            acceptsKind: ["draftWorkflow", "publishedWorkflow", "listing"],
        }),
        defineField.Dependency("draftOnly", "Draft Only", {
            acceptsKind: ["draftWorkflow"],
        }),
        defineField.Dependency("publishedOnly", "Published Only", {
            acceptsKind: ["publishedWorkflow"],
        }),
        defineField.Dependency("listingOnly", "Listing Only", {
            acceptsKind: ["listing"],
        }),
        defineField.Dependency("skillOnly", "Skill Only", {
            acceptsKind: ["skill"],
        }),
        defineField.Dependency("anyKind", "Any Kind", {
            acceptsKind: ["draftWorkflow", "publishedWorkflow", "listing", "skill"],
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
        defineOutput.Data("refs", "References", {
            tooltip: "The reference each field points at, or null when it is empty."
        }),
    ],
});
