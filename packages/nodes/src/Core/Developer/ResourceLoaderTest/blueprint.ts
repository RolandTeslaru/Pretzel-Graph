import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.ResourceLoaderTest",
    displayName: "Resource Loader Test",
    description: "Dev node for testing the ResourceLoader field. Loaders return mock data.",
    icon: "FlaskConical",
    accent: "utility",
    fields: [
        // Placeholder for credential — will be replaced by defineField.Credential once that exists
        defineField.ResourceLoader("schema", "Schema", {
            loaderId:"schemaSearch",
            placeholder: "Select a schema",
            required: true
        }),
        defineField.ResourceLoader("table", "Table", {
            loaderId:"tableSearch",
            dependsOn: ["schema"],
            placeholder: "Select a table",
            required: true
        }),
    ],
    inputs: [
        defineInput.Message("input", "Input", {
            required: true
        }),
    ],
    outputs: [
        defineOutput.Message("output", "Output", {
            tooltip: "Passes input through with selected schema/table logged."
        }),
    ],
});
