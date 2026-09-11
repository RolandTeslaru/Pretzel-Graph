import { defineField, defineBlueprint, defineOutput } from "@pretzel-graph/node-sdk";
import { Anthropic } from "@pretzel-graph/nodes/Credentials/Anthropic";

export const Blueprint = defineBlueprint({
    id: "Integrations.Anthropic.Chat",
    displayName: "Anthropic Chat",
    description: "This node talks to Anthropic Claude models",
    icon: "Anthropic",
    accent: "port-LanguageModel",
    credentials: [Anthropic],
    fields: [
        defineField.MultiOption("model", "Model", {
            options: [
                { value: "claude-fable-5", displayName: "Claude Fable 5" },
                { value: "claude-opus-5", displayName: "Claude Opus 5" },
                { value: "claude-sonnet-5", displayName: "Claude Sonnet 5" },
                { value: "claude-haiku-4-5", displayName: "Claude Haiku 4.5" },
            ],

            initialValue: "claude-sonnet-5"
        }),
        defineField.Integer("maxTokens", "Max Tokens", {
            required: false,
            min: 1,
            step: 1,
            tooltip: "Maximum number of tokens to generate."
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.LanguageModel("languageModel", "Language Model", {
            tooltip: "The language model instance used for this response, useful for chaining calls with the same model and settings."
        })
    ]
})
