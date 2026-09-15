import { defineBlueprint, defineInput, defineOutput, defineTool } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Skill.Load",
    displayName: "Load Skill",
    description: "Loads the full instructions of the connected skills, or gives an agent a tool that loads one when a task calls for it.",
    icon: "BookCheck",
    accent: "port-Skill",
    toolCompatible: true,
    fields: [],
    inputs: [
        defineInput.SkillList("skills", "Skills", {
            required: true,
        }),
    ],
    outputs: [
        defineOutput.DataList("instructions", "Instructions", {
            tooltip: "Every connected skill as an item with its name, description and full instructions.",
        }),
    ],

    "isConvertedToTool==true": defineTool({
        fields: [],
        inputs: [
            defineInput.SkillList("skills", "Skills", {
                required: true,
            }),
        ],
        outputs: [
            defineOutput.Tool("tool", "Load Skill Tool", {
                tooltip: "A tool that lists every connected skill; calling it returns that skill's instructions.",
            }),
        ],
    }),
});

export type Blueprint = typeof Blueprint;
