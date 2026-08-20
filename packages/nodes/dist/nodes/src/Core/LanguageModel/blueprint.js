"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.LanguageModel",
    displayName: "Language Model",
    description: "Runs a language model given a specified provider.",
    icon: "BrainCircuit",
    accent: "port-LanguageModel",
    fields: [
        node_sdk_1.FieldBuilder.Boolean("stream", "Stream", {
            initialValue: false,
            tooltip: "Whether to stream the response",
            advanced: true
        }),
        node_sdk_1.FieldBuilder.String("systemMessage", "System Message", {
            initialValue: "",
            tooltip: "A system message that helps set the behavior of the assistant"
        })
    ],
    inputs: [
        node_sdk_1.InputBuilder.ToolList("tools", "Tools", {}),
        node_sdk_1.InputBuilder.LanguageModel("languageModel", "Language Model", {
            required: true
        }),
        node_sdk_1.InputBuilder.MessageList("messages", "Messages", {
            required: true
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Message("response", "Response", {
            tooltip: "The response from the model"
        })
    ]
});
