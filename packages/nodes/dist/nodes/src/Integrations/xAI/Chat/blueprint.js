"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const xAI_1 = require("../../../Credentials/xAI");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.xAI.Chat",
    displayName: "xAI Grok Chat",
    description: "This node talks to xAI's Grok models via the xAI API",
    icon: "Grok",
    accent: "port-LanguageModel",
    credentials: [xAI_1.xAI],
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("model", "Model", {
            options: [
                { value: "grok-4.3", displayName: "Grok 4.3" },
                { value: "grok-4.20-0309-reasoning", displayName: "Grok 4.20 Reasoning" },
                { value: "grok-4.20-0309-non-reasoning", displayName: "Grok 4.20 Non-Reasoning" },
                { value: "grok-4.20-multi-agent-0309", displayName: "Grok 4.20 Multi-Agent" },
                { value: "grok-3", displayName: "Grok 3" },
                { value: "grok-3-mini", displayName: "Grok 3 Mini" },
            ],
            initialValue: "grok-4.3"
        }),
        node_sdk_1.FieldBuilder.Float("temperature", "Temperature", {
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values make output more random, lower values make it more focused and deterministic."
        }),
        node_sdk_1.FieldBuilder.Integer("maxTokens", "Max Tokens", {
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate in the chat completion."
        }),
        node_sdk_1.FieldBuilder.Float("topP", "Top P", {
            initialValue: 1.0,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true,
            tooltip: "Nucleus sampling: considers the tokens with top_p probability mass.",
            advanced: true
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.LanguageModel("languageModel", "Language Model", {
            tooltip: "The language model instance, useful for chaining calls with the same model and settings."
        })
    ]
});
