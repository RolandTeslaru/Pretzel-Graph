import { FieldBuilder, defineBlueprint, OutputBuilder } from "@vx-agent-editor/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.Google.GenerativeAI",
    displayName: "Google Gen AI",
    description: "This node talks to google generative ai api",
    icon: "Google",
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
                { value: "gemini-3-pro-preview", displayName: "Gemini 3 Pro Preview" },
                { value: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
                { value: "gemini-3-flash-preview", displayName: "Gemini 3 Flash Preview" },
                { value: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
                { value: "gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite" },
            ],
            initialValue: "gemini-3-pro-preview",
        }),
        FieldBuilder.Float({
            id: "temperature",
            displayName: "Temperature",
            required: false,
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values are more creative.",
        }),
        FieldBuilder.Integer({
            id: "maxOutputTokens",
            displayName: "Max Output Tokens",
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
