"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Text.Input",
    displayName: "Text Input",
    description: "This node is a Text input",
    icon: "Type",
    accent: "port-Text",
    fields: [
        node_sdk_1.FieldBuilder.String("text", "Text", {
            required: true,
            multiline: true
        })
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Message("output", "Output", {
            tooltip: "The output from the model"
        })
    ]
});
