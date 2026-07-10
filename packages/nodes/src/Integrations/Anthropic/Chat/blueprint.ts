import { FieldBuilder, defineBlueprint, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Anthropic } from "@pretzel-graph/nodes/Credentials/Anthropic";

export const Blueprint = defineBlueprint({
    id: "Integrations.Anthropic.Chat",
    displayName: "Anthropic Chat",
    description: "This node talks to Anthropic Claude models",
    icon: "Anthropic",
    accent: "port-LanguageModel",
    credentials: [Anthropic],
    fields: [
        FieldBuilder.MultiOption({
            id: "model",
            displayName: "Model",
            options: [
                { value: "claude-sonnet-5", displayName: "Claude Sonnet 5" },
                { value: "claude-fable-5", displayName: "Claude Fable 5" },
                { value: "claude-opus-4-8", displayName: "Claude Opus 4.8" },
                { value: "claude-opus-4-7", displayName: "Claude Opus 4.7" },
                { value: "claude-sonnet-4-6", displayName: "Claude Sonnet 4.6" },
                { value: "claude-opus-4-6", displayName: "Claude Opus 4.6" },
                { value: "claude-haiku-4-5", displayName: "Claude Haiku 4.5" },
            ],
            initialValue: "claude-sonnet-5",
        }),
        FieldBuilder.Integer({
            id: "maxTokens",
            displayName: "Max Tokens",
            required: false,
            min: 1,
            step: 1,
            tooltip: "Maximum number of tokens to generate.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.LanguageModel({
            id: "languageModel",
            displayName: "Language Model",
            tooltip: "The language model instance used for this response, useful for chaining calls with the same model and settings.",
        })
    ]
})
