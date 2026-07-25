import { FieldBuilder, defineBlueprint, OutputBuilder } from "@pretzel-graph/node-sdk";
import { OpenRouter } from "@pretzel-graph/nodes/Credentials/OpenRouter";

export const Blueprint = defineBlueprint({
    id: "Integrations.OpenRouter.Chat",
    displayName: "OpenRouter Chat",
    description: "Connect to hundreds of models via OpenRouter's unified API",
    icon: "OpenRouter",
    accent: "port-LanguageModel",
    credentials: [OpenRouter],
    fields: [
        FieldBuilder.reconciling(FieldBuilder.MultiOption("provider", "Provider", {
            options: [
                { value: "Anthropic" },
                { value: "Google" },
                { value: "OpenAI" },
                { value: "Meta" },
                { value: "DeepSeek" },
                { value: "Mistral" },
                { value: "Cohere" },
                { value: "xAI" },
            ],

            initialValue: "Google",
            tooltip: "Filter the model list by provider."
        })),
        FieldBuilder.MultiOption("model", "Model", {
            options: [
                { value: "google/gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro Preview" },
                { value: "google/gemini-3.1-flash-lite-preview", displayName: "Gemini 3.1 Flash Lite Preview" },
                { value: "google/gemini-3-flash-preview", displayName: "Gemini 3 Flash Preview" },
                { value: "google/gemma-4-31b-it", displayName: "Gemma 4 31B IT" },
            ],

            initialValue: "google/gemini-3.1-pro-preview"
        }),
        FieldBuilder.Float("temperature", "Temperature", {
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values make output more random."
        }),
        FieldBuilder.Integer("maxTokens", "Max Tokens", {
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate."
        }),
        FieldBuilder.Float("topP", "Top P", {
            initialValue: 1.0,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true,
            tooltip: "Nucleus sampling: considers the tokens with top_p probability mass."
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.LanguageModel("languageModel", "Language Model", {
            tooltip: "The OpenRouter language model instance."
        })
    ]
});
