import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.JsonInjector",
    displayName: "JSON Injector",
    description: "Injects JSON data into the flow.",
    icon: "Braces",
    accent: "utility",
    fields: [
        FieldBuilder.Json({
            id: "data",
            displayName: "JSON Data",
            initialValue: {},
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data({
            id: "output",
            displayName: "Output",
        }),
    ],
});
