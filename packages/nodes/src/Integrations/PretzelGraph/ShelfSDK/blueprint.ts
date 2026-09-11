import { defineBlueprint, defineTool, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.PretzelGraph.ShelfSDK",
    displayName: "Shelf SDK",
    description: "Searches the blueprints that can be placed on a workflow and describes their fields and ports.",
    icon: "PretzelGraphAppIcon",
    accent: "utility",
    toolCompatible: true,
    credentials: [],
    fields: [
        FieldBuilder.MultiOption("operation", "Operation", {
            options: [
                { value: "query",       displayName: "Query blueprints" },
                { value: "get",         displayName: "Get blueprint" },
                { value: "derivations", displayName: "Get derivations" },
            ],
            initialValue: "query",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data("result", "Result", {
            tooltip: "Matching blueprint summaries, one blueprint's fields and ports, or the branches its node can take.",
        }),
    ],

    "operation==query": {
        fields: [
            FieldBuilder.Json("filters", "Filters", {
                initialValue: {},
                tooltip: "Optional filters: ids, displayName, drawerIds, toolCompatible, proxyCompatible, derivable, fieldIds, inputVariants, outputVariants, limit.",
            }),
        ],
    },

    "operation==get": {
        fields: [FieldBuilder.String("getBlueprintId", "Blueprint", { required: true, placeholder: "Core.Text.Input" })],
    },

    "operation==derivations": {
        fields: [FieldBuilder.String("derivationsBlueprintId", "Blueprint", { required: true, placeholder: "Core.Developer.DerivativeTest" })],
    },

    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Shelf Tools")],
    }),
});
