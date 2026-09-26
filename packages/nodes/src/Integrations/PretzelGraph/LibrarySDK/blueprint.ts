import { defineBlueprint, defineTool, defineField, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.PretzelGraph.LibrarySDK",
    displayName: "Library SDK",
    description: "Finds what is saved in this workspace's library: workflows, folders, skills and connections.",
    icon: "PretzelGraphAppIcon",
    accent: "utility",
    toolCompatible: true,
    credentials: [],
    fields: [
        defineField.MultiOption("operation", "Operation", {
            options: [
                { value: "query", displayName: "Find library items" },
            ],
            initialValue: "query",
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.Data("result", "Result", {
            tooltip: "The matching items: kind, id, name, folder and when each was last changed.",
        }),
    ],

    "operation==query": {
        fields: [
            defineField.Json("kinds", "Kinds", {
                initialValue: [],
                tooltip: "Only these kinds: workflow, folder, skill, connection. Empty matches every kind.",
            }),
            defineField.String("displayName", "Name Contains", {
                initialValue: "",
                tooltip: "Only items whose name contains this text. Empty matches every item.",
            }),
        ],
    },

    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Library Tools")],
    }),
});
