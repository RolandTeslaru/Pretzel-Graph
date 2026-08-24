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
        FieldBuilder.MultiOption("model", "Model", {
            options: [
                { value: "gemini-3.1-pro-preview", displayName: "Gemini 3.1 Pro Preview" },
                { value: "gemini-3.7-flash", displayName: "Gemini 3.7 Flash" },
                { value: "gemini-3.6-flash", displayName: "Gemini 3.6 Flash" },
                { value: "gemini-3.5-flash", displayName: "Gemini 3.5 Flash" },
                { value: "gemini-3.5-flash-lite", displayName: "Gemini 3.5 Flash Lite" },
                { value: "gemini-3.1-flash-lite", displayName: "Gemini 3.1 Flash Lite" },
            ],

            initialValue: "gemini-3.1-pro-preview"
        }),
        FieldBuilder.Float("temperature", "Temperature", {
            required: false,
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values are more creative."
        }),
        FieldBuilder.Integer("maxOutputTokens", "Max Output Tokens", {
            required: false,
            min: 1,
            step: 1,
            tooltip: "Maximum tokens to generate. For reasoning models (Gemini 3, 2.5) thinking tokens count against this budget — set it high enough to fit both reasoning and the final answer, or responses get truncated (finishReason: MAX_TOKENS)."
        }),
        FieldBuilder.Float("topP", "Top P", {
            required: false,
            initialValue: 0.95,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true,
            tooltip: "Nucleus sampling probability."
        }),
        FieldBuilder.Integer("topK", "Top K", {
            required: false,
            initialValue: 64,
            min: 1,
            step: 1,
            slider: true,
            tooltip: "Top-K sampling parameter."
        }),
        FieldBuilder.Integer("thinkingBudget", "Thinking Budget", {
            required: false,
            advanced: true,
            initialValue: -1,
            min: -1,
            step: 1,
            tooltip: "Tokens the model may spend on internal reasoning (counts toward Max Output Tokens). -1 = dynamic (model decides), 0 = disable thinking (Flash models only; Pro has a fixed minimum). Higher = more reasoning headroom."
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.LanguageModel("languageModel", "Language Model", {
            tooltip: "The language model instance used for this response, useful for chaining calls with the same model and settings."
        })
    ]
})
