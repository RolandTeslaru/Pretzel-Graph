import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.ResourceLoaderTest",
    displayName: "Resource Loader Test",
    description: "Dev node for testing the ResourceLoader field. Loaders return mock data.",
    icon: "FlaskConical",
    accent: "utility",
    fields: [
        // Placeholder for credential — will be replaced by FieldBuilder.Credential once that exists
        FieldBuilder.ResourceLoader("schema", "Schema", {
            loaderId:"schemaSearch",
            placeholder: "Select a schema",
            required: true
        }),
        FieldBuilder.ResourceLoader("table", "Table", {
            loaderId:"tableSearch",
            dependsOn: ["schema"],
            placeholder: "Select a table",
            required: true
        }),
    ],
    inputs: [
        InputBuilder.Message("input", "Input", {
            required: true
        }),
    ],
    outputs: [
        OutputBuilder.Message("output", "Output", {
            tooltip: "Passes input through with selected schema/table logged."
        }),
    ],
});
