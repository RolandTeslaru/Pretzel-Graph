import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Anthropic.Chat",
    displayName: "Anthropic Chat",
    description: "This node talks to Anthropic Claude models",
    icon: "Anthropic",
    accent: "port-LanguageModel",
    fields: [
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "API Key",
        }),
        FieldBuilder.MultiOption({
            id: "model",
            displayName: "Model",
            options: [
                "claude-3-5-sonnet-20240620",
                "claude-3-opus-20240229",
                "claude-3-haiku-20240307",
                "claude-2.1",
                "claude-2.0",
                "claude-instant-1.2"
            ],
            initialValue: "claude-3-5-sonnet-20240620",
        }),
        FieldBuilder.Float({
            id: "temperature",
            displayName: "Temperature",
            required: false,
            initialValue: 0.7,
            min: 0,
            max: 1.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values are more creative.",
        }),
        FieldBuilder.Integer({
            id: "maxTokens",
            displayName: "Max Tokens",
            required: false,
            initialValue: 2048,
            min: 1,
            step: 1,
            tooltip: "Maximum number of tokens to generate.",
        }),
        FieldBuilder.Float({
            id: "topP",
            displayName: "Top P",
            required: false,
            initialValue: 0.95,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true,
            tooltip: "Nucleus sampling probability.",
        }),
        FieldBuilder.Integer({
            id: "topK",
            displayName: "Top K",
            required: false,
            initialValue: 64,
            min: 1,
            step: 1,
            slider: true,
            tooltip: "Top-K sampling parameter.",
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
