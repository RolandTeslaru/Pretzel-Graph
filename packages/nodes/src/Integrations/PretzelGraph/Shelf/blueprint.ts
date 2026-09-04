import { defineBlueprint, defineTool, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.PretzelGraph.Shelf",
    displayName: "Shelf",
    description: "Lists the blueprints that can be placed on a workflow and describes their fields and ports.",
    icon: "Pretzel",
    accent: "utility",
    toolCompatible: true,
    credentials: [],
    fields: [
        FieldBuilder.MultiOption("operation", "Operation", {
            options: [
                { value: "list", displayName: "List blueprints" },
                { value: "get",  displayName: "Get blueprint" },
            ],
            initialValue: "list",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data("result", "Result", {
            tooltip: "The drawers and their blueprint ids, or one blueprint's fields and ports.",
        }),
    ],

    "operation==get": {
        fields: [FieldBuilder.String("blueprintId", "Blueprint", { required: true, placeholder: "Core.Text.Input" })],
    },

    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Shelf Tools")],
    }),
});
