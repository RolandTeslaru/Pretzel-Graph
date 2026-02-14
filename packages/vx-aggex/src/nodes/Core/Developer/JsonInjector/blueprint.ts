import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.JsonInjector",
    displayName: "JSON Injector",
    description: "Injects JSON data into the flow.",
    icon: "Code",
    fields: [
        FieldBuilder.Json({
            id: "data",
            displayName: "JSON Data",
            initialValue: {},
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.DataFrame({
            id: "output",
            displayName: "Output",
        }),
    ],
});
