import { defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Google.GenerativeAI",
    icon: "Google",
    displayName: "Google Generative AI",
    description: "This node talks to google generative ai api",
    inputs: [
        InputBuilder.Secret({
            id: "api_key",
            displayName: "API Key",
            initialValue: "",
            advanced: false,
        }),
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
            required: true,
            advanced: false,
        }),
        InputBuilder.Message({
            id: "systemMessage",
            displayName: "System Message",
            required: true,
            advanced: false,
        }),
        InputBuilder.MultiOption({
            id: "model",
            displayName: "Model",
            options: [
                "gemini-3-pro-preview",
                "gemini-2.5-pro",
                "gemini-3-flash-preview",
                "gemini-2.5-flash",
                "gemini-2.5-flash-lite",
            ],
            initialValue: "gemini-3-pro-preview",
            advanced: false,
        }),
        InputBuilder.Float({
            id: "temperature",
            displayName: "Temperature",
            required: false,
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            tooltip: "Controls randomness in the output. Higher values are more creative.",
            advanced: false,
        }),
        InputBuilder.Integer({
            id: "maxOutputTokens",
            displayName: "Max Output Tokens",
            required: false,
            initialValue: 2048,
            min: 1,
            step: 1,
            tooltip: "Maximum number of tokens to generate.",
            advanced: false,
        }),
        InputBuilder.Float({
            id: "topP",
            displayName: "Top P",
            required: false,
            initialValue: 0.95,
            min: 0,
            max: 1,
            step: 0.01,
            tooltip: "Nucleus sampling probability.",
            advanced: false,
        }),
        InputBuilder.Integer({
            id: "topK",
            displayName: "Top K",
            required: false,
            initialValue: 64,
            min: 1,
            step: 1,
            tooltip: "Top-K sampling parameter.",
            advanced: false,
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The response from the model",
        }),
        OutputBuilder.LanguageModel({
            id: "languageModel",
            displayName: "Language Model",
            tooltip: "The language model instance used for this response, useful for chaining calls with the same model and settings.",
        })
    ]
})