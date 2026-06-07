import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.ResourceLoaderTest",
    displayName: "Resource Loader Test",
    description: "Dev node for testing the ResourceLoader field. Loaders return mock data.",
    icon: "FlaskConical",
    accent: "utility",
    fields: [
        // Placeholder for credential — will be replaced by FieldBuilder.Credential once that exists
        FieldBuilder.ResourceLoader({
            id: "schema",
            displayName: "Schema",
            loaderId:"schemaSearch",
            placeholder: "Select a schema",
            required: true,
        }),
        FieldBuilder.ResourceLoader({
            id: "table",
            displayName: "Table",
            loaderId:"tableSearch",
            dependsOn: ["schema"],
            placeholder: "Select a table",
            required: true,
        }),
    ],
    inputs: [
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
            required: true,
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "output",
            displayName: "Output",
            tooltip: "Passes input through with selected schema/table logged.",
        }),
    ],
});
