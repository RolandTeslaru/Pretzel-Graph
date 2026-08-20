"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const OpenAI_1 = require("../../../Credentials/OpenAI");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.OpenAI.Chat",
    displayName: "OpenAI Chat",
    description: "This node talks to OpenAI's GPT chat models via the Chat Completions API",
    icon: "OpenAI",
    accent: "port-LanguageModel",
    credentials: [OpenAI_1.OpenAI],
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("model", "Model", {
            options: [
                { value: "gpt-5.5", displayName: "GPT-5.5" },
                { value: "gpt-5.4", displayName: "GPT-5.4" },
                { value: "gpt-5.4-pro", displayName: "GPT-5.4 Pro" },
                { value: "gpt-5.4-mini", displayName: "GPT-5.4 Mini" },
                { value: "gpt-5.4-nano", displayName: "GPT-5.4 Nano" },
                { value: "gpt-5.2", displayName: "GPT-5.2" },
                { value: "gpt-5.2-pro", displayName: "GPT-5.2 Pro" },
                { value: "o3", displayName: "o3" },
            ],
            initialValue: "gpt-5.5"
        }),
        node_sdk_1.FieldBuilder.Float("temperature", "Temperature", {
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values (e.g., 0.8) make output more random, lower values (e.g., 0.2) make it more focused and deterministic."
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
            tooltip: "Nucleus sampling: considers the tokens with top_p probability mass. 0.1 means only tokens comprising the top 10% probability mass are considered."
        }),
        node_sdk_1.FieldBuilder.Float("frequencyPenalty", "Frequency Penalty", {
            initialValue: 0,
            min: -2.0,
            max: 2.0,
            step: 0.1,
            tooltip: "Penalizes new tokens based on their existing frequency in the text so far. Positive values decrease the model's likelihood to repeat the same line verbatim.",
            advanced: true
        }),
        node_sdk_1.FieldBuilder.Float("presencePenalty", "Presence Penalty", {
            initialValue: 0,
            min: -2.0,
            max: 2.0,
            step: 0.1,
            tooltip: "Penalizes new tokens based on whether they appear in the text so far. Positive values increase the model's likelihood to talk about new topics.",
            advanced: true
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.LanguageModel("languageModel", "Language Model", {
            tooltip: "The language model instance used for this response, useful for chaining calls with the same model and settings."
        })
    ]
});
