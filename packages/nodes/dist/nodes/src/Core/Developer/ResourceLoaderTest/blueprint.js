"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Developer.ResourceLoaderTest",
    displayName: "Resource Loader Test",
    description: "Dev node for testing the ResourceLoader field. Loaders return mock data.",
    icon: "FlaskConical",
    accent: "utility",
    fields: [
        // Placeholder for credential — will be replaced by FieldBuilder.Credential once that exists
        node_sdk_1.FieldBuilder.ResourceLoader("schema", "Schema", {
            loaderId: "schemaSearch",
            placeholder: "Select a schema",
            required: true
        }),
        node_sdk_1.FieldBuilder.ResourceLoader("table", "Table", {
            loaderId: "tableSearch",
            dependsOn: ["schema"],
            placeholder: "Select a table",
            required: true
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.Message("input", "Input", {
            required: true
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Message("output", "Output", {
            tooltip: "Passes input through with selected schema/table logged."
        }),
    ],
});
