import { defineField, defineBlueprint, defineOutput } from "@pretzel-graph/node-sdk";
import { xAI } from "@pretzel-graph/nodes/Credentials/xAI";

export const Blueprint = defineBlueprint({
    id: "Integrations.xAI.Chat",
    displayName: "xAI Grok Chat",
    description: "This node talks to xAI's Grok models via the xAI API",
    icon: "Grok",
    accent: "port-LanguageModel",
    credentials: [xAI],
    fields: [
        defineField.MultiOption("model", "Model", {
            options: [
                { value: "grok-4.6", displayName: "Grok 4.6" },
                { value: "grok-4.5", displayName: "Grok 4.5" },
                { value: "grok-4.3", displayName: "Grok 4.3" },
                { value: "grok-4.20-0309-reasoning", displayName: "Grok 4.20 Reasoning" },
                { value: "grok-4.20-0309-non-reasoning", displayName: "Grok 4.20 Non-Reasoning" },
                { value: "grok-4.20-multi-agent-0309", displayName: "Grok 4.20 Multi-Agent" },
            ],

            initialValue: "grok-4.6"
        }),
        defineField.Float("temperature", "Temperature", {
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values make output more random, lower values make it more focused and deterministic."
        }),
        defineField.Integer("maxTokens", "Max Tokens", {
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate in the chat completion."
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.LanguageModel("languageModel", "Language Model", {
            tooltip: "The language model instance, useful for chaining calls with the same model and settings."
        })
    ]
})
