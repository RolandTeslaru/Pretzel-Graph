import { defineBlueprint, defineField, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Skill.Source",
    displayName: "Skill",
    description: "Provides one skill from your library to the nodes it connects to.",
    icon: "Sparkles2",
    accent: "port-Skill",
    fields: [
        defineField.Dependency("skill", "Skill", {
            acceptsKind: ["skill"],
            required: true,
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.Skill("skill", "Skill", {
            tooltip: "The selected skill, ready to merge into a skill list.",
        }),
    ],
});

export type Blueprint = typeof Blueprint;
