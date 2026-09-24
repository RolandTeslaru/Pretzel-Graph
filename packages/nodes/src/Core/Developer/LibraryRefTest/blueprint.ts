import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.LibraryRefTest",
    displayName: "Library Ref Field Test",
    description: "One library ref field for each combination of accepted kinds. Outputs the reference each field holds.",
    icon: "Graph",
    accent: "utility",
    fields: [
        defineField.LibraryRef("workflowOnly", "Workflow Only", {
            accepts: ["workflow"],
        }),
        defineField.LibraryRef("skillOnly", "Skill Only", {
            accepts: ["skill"],
        }),
        defineField.LibraryRef("folderOnly", "Folder Only", {
            accepts: ["folder"],
        }),
        defineField.LibraryRef("anyConnection", "Any Connection", {
            accepts: ["connection"],
        }),
        defineField.LibraryRef("discordConnection", "Discord Connection", {
            accepts: ["connection"],
            definitionId: "Connections.Discord",
        }),
        defineField.LibraryRef("anyKind", "Any Kind", {
            accepts: ["workflow", "folder", "skill", "connection"],
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
