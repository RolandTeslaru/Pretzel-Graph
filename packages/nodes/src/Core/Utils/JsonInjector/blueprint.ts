import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.JsonInjector",
    displayName: "JSON Injector",
    description: "Injects JSON data into the flow.",
    icon: "Braces",
    accent: "utility",
    fields: [
        defineField.Json("data", "JSON Data", {
            initialValue: {}
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.Data("output", "Output", {}),
    ],
});
