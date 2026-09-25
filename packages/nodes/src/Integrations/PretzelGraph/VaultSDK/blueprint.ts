import { defineBlueprint, defineTool, defineField, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.PretzelGraph.VaultSDK",
    displayName: "Vault SDK",
    description: "Lists the credential instances saved in this workspace, with the template each was made from. Never their secrets.",
    icon: "PretzelGraphAppIcon",
    accent: "utility",
    toolCompatible: true,
    credentials: [],
    fields: [
        defineField.MultiOption("operation", "Operation", {
            options: [
                { value: "list", displayName: "List credential instances" },
            ],
            initialValue: "list",
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.Data("result", "Result", {
            tooltip: "The matching credential instances: id, name, template and when each was last changed.",
        }),
    ],

    "operation==list": {
        fields: [
            defineField.Json("templateIds", "Templates", {
                initialValue: [],
                tooltip: "Only instances of these credential templates, e.g. [\"postgres\"]. Empty lists every instance.",
            }),
        ],
    },

    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Vault Tools")],
    }),
});
