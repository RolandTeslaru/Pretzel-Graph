"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const OpenRouter_1 = require("../../../Credentials/OpenRouter");
const model = (value, displayName) => ({
    value,
    displayName,
});
const MODELS = {
    Anthropic: [
        model("anthropic/claude-opus-4.6", "Claude Opus 4.6"),
        model("anthropic/claude-sonnet-4.6", "Claude Sonnet 4.6"),
    ],
    Google: [
        model("google/gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview"),
        model("google/gemini-3.1-flash-lite-preview", "Gemini 3.1 Flash Lite Preview"),
        model("google/gemini-3-flash-preview", "Gemini 3 Flash Preview"),
        model("google/gemma-4-31b-it", "Gemma 4 31B IT"),
    ],
    OpenAI: [
        model("openai/gpt-5.4-pro", "GPT-5.4 Pro"),
        model("openai/gpt-5.4", "GPT-5.4"),
        model("openai/gpt-5.4-mini", "GPT-5.4 Mini"),
        model("openai/gpt-5.4-nano", "GPT-5.4 Nano"),
        model("openai/gpt-5.3-chat", "GPT-5.3 Chat"),
    ],
    Meta: [
        model("meta-llama/llama-4-maverick-17b-128e-instruct", "Llama 4 Maverick 17B"),
        model("meta-llama/llama-4-scout-17b-16e-instruct", "Llama 4 Scout 17B"),
        model("meta-llama/llama-3.3-70b-instruct", "Llama 3.3 70B"),
        model("meta-llama/llama-3.1-405b-instruct", "Llama 3.1 405B"),
        model("meta-llama/llama-3.1-70b-instruct", "Llama 3.1 70B"),
    ],
    DeepSeek: [
        model("deepseek/deepseek-v3.2-speciale-20251201", "DeepSeek V3.2 Speciale"),
        model("deepseek/deepseek-v3.2-20251201", "DeepSeek V3.2"),
        model("deepseek/deepseek-r1-0528", "DeepSeek R1 0528"),
        model("deepseek/deepseek-r1", "DeepSeek R1"),
        model("deepseek/deepseek-chat-v3-0324", "DeepSeek Chat V3"),
        model("deepseek/deepseek-r1-distill-llama-70b", "DeepSeek R1 Distill Llama 70B"),
    ],
    Mistral: [
        model("mistralai/mistral-small-2603", "Mistral Small 2603"),
        model("mistralai/mistral-small-creative", "Mistral Small Creative"),
    ],
    Cohere: [
        model("cohere/command-a-03-2025", "Command A 03-2025"),
        model("cohere/command-a", "Command A"),
        model("cohere/command-r-plus-08-2024", "Command R+ 08-2024"),
        model("cohere/command-r-08-2024", "Command R 08-2024"),
        model("cohere/command-r7b-12-2024", "Command R7B 12-2024"),
    ],
    xAI: [
        model("x-ai/grok-4.20", "Grok 4.20"),
        model("x-ai/grok-4.20-multi-agent", "Grok 4.20 Multi-Agent"),
    ],
};
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.OpenRouter.Chat",
    displayName: "OpenRouter Chat",
    description: "Connect to hundreds of models via OpenRouter's unified API",
    icon: "OpenRouter",
    accent: "port-LanguageModel",
    credentials: [OpenRouter_1.OpenRouter],
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("provider", "Provider", {
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
        }),
        node_sdk_1.FieldBuilder.Float("temperature", "Temperature", {
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values make output more random."
        }),
        node_sdk_1.FieldBuilder.Integer("maxTokens", "Max Tokens", {
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate."
        }),
        node_sdk_1.FieldBuilder.Float("topP", "Top P", {
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
        node_sdk_1.OutputBuilder.LanguageModel("languageModel", "Language Model", {
            tooltip: "The OpenRouter language model instance."
        })
    ],
    "provider==Anthropic": {
        fields: [node_sdk_1.FieldBuilder.MultiOption("anthropicModel", "Model", {
                options: MODELS.Anthropic,
                initialValue: "anthropic/claude-opus-4.6",
            })],
    },
    "provider==Google": {
        fields: [node_sdk_1.FieldBuilder.MultiOption("googleModel", "Model", {
                options: MODELS.Google,
                initialValue: "google/gemini-3.1-pro-preview",
            })],
    },
    "provider==OpenAI": {
        fields: [node_sdk_1.FieldBuilder.MultiOption("openAIModel", "Model", {
                options: MODELS.OpenAI,
                initialValue: "openai/gpt-5.4-pro",
            })],
    },
    "provider==Meta": {
        fields: [node_sdk_1.FieldBuilder.MultiOption("metaModel", "Model", {
                options: MODELS.Meta,
                initialValue: "meta-llama/llama-4-maverick-17b-128e-instruct",
            })],
    },
    "provider==DeepSeek": {
        fields: [node_sdk_1.FieldBuilder.MultiOption("deepSeekModel", "Model", {
                options: MODELS.DeepSeek,
                initialValue: "deepseek/deepseek-v3.2-speciale-20251201",
            })],
    },
    "provider==Mistral": {
        fields: [node_sdk_1.FieldBuilder.MultiOption("mistralModel", "Model", {
                options: MODELS.Mistral,
                initialValue: "mistralai/mistral-small-2603",
            })],
    },
    "provider==Cohere": {
        fields: [node_sdk_1.FieldBuilder.MultiOption("cohereModel", "Model", {
                options: MODELS.Cohere,
                initialValue: "cohere/command-a-03-2025",
            })],
    },
    "provider==xAI": {
        fields: [node_sdk_1.FieldBuilder.MultiOption("xaiModel", "Model", {
                options: MODELS.xAI,
                initialValue: "x-ai/grok-4.20",
            })],
    },
});
