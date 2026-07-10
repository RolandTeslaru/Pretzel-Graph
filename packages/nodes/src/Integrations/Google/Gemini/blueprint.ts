import { FieldBuilder, defineBlueprint, OutputBuilder } from "@pretzel-graph/node-sdk";
import { OpenAI } from "@pretzel-graph/nodes/Credentials";
import { GoogleGemini } from "@pretzel-graph/nodes/Credentials/GoogleGemini";

export const Blueprint = defineBlueprint({
    id: "Integrations.Google.Gemini",
    displayName: "Google Gemini",
    description: "This node talks to google generative ai api",
    icon: "GoogleGemini",
    accent: "port-LanguageModel",
    credentials: [GoogleGemini],
    fields: [
        FieldBuilder.MultiOption({
            id: "model",
            displayName: "Model",
            options: [
                { value: "gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro Preview" },
                { value: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
                { value: "gemini-3-flash-preview", displayName: "Gemini 3 Flash Preview" },
                { value: "gemini-3.1-flash-lite-preview", displayName: "Gemini 3.1 Flash Lite Preview" },
                { value: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
                { value: "gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite" },
            ],
            initialValue: "gemini-3.1-pro-preview",
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
            min: 1,
            step: 1,
            tooltip: "Maximum tokens to generate. For reasoning models (Gemini 3, 2.5) thinking tokens count against this budget — set it high enough to fit both reasoning and the final answer, or responses get truncated (finishReason: MAX_TOKENS).",
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
        FieldBuilder.Integer({
            id: "thinkingBudget",
            displayName: "Thinking Budget",
            required: false,
            advanced: true,
            initialValue: -1,
            min: -1,
            step: 1,
            tooltip: "Tokens the model may spend on internal reasoning (counts toward Max Output Tokens). -1 = dynamic (model decides), 0 = disable thinking (Flash models only; Pro has a fixed minimum). Higher = more reasoning headroom.",
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
