import { defineField, defineBlueprint, defineOutput } from "@pretzel-graph/node-sdk";
import { OpenRouter } from "@pretzel-graph/nodes/Credentials/OpenRouter";

const model = <const T extends string>(value: T, displayName: string) => ({
    value,
    displayName,
});

const MODELS = {
    Anthropic: [
        model("anthropic/claude-opus-5", "Claude Opus 5"),
        model("anthropic/claude-sonnet-5", "Claude Sonnet 5"),
    ],
    Google: [
        model("google/gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview"),
        model("google/gemini-3.7-flash", "Gemini 3.7 Flash"),
        model("google/gemini-3.6-flash", "Gemini 3.6 Flash"),
        model("google/gemini-3.5-flash", "Gemini 3.5 Flash"),
        model("google/gemini-3.5-flash-lite", "Gemini 3.5 Flash Lite"),
        model("google/gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite"),
        model("google/gemma-4-31b-it", "Gemma 4 31B IT"),
    ],
    OpenAI: [
        model("openai/gpt-5.6-sol-pro", "GPT-5.6 Sol Pro"),
        model("openai/gpt-5.6-sol", "GPT-5.6 Sol"),
        model("openai/gpt-5.6-terra", "GPT-5.6 Terra"),
        model("openai/gpt-5.6-luna", "GPT-5.6 Luna"),
    ],
    Meta: [
        model("meta-llama/llama-4-maverick", "Llama 4 Maverick"),
        model("meta-llama/llama-4-scout", "Llama 4 Scout"),
    ],
    DeepSeek: [
        model("deepseek/deepseek-v4-pro", "DeepSeek V4 Pro"),
        model("deepseek/deepseek-v4-flash", "DeepSeek V4 Flash"),
        model("deepseek/deepseek-v3.2", "DeepSeek V3.2"),
    ],
    Mistral: [
        model("mistralai/mistral-large-2512", "Mistral Large 2512"),
        model("mistralai/mistral-medium-3.1", "Mistral Medium 3.1"),
        model("mistralai/mistral-small-2603", "Mistral Small 2603"),
    ],
    Cohere: [
        model("cohere/command-a", "Command A"),
    ],
    xAI: [
        model("x-ai/grok-4.6", "Grok 4.6"),
        model("x-ai/grok-4.5", "Grok 4.5"),
        model("x-ai/grok-4.3", "Grok 4.3"),
        model("x-ai/grok-4.20", "Grok 4.20"),
        model("x-ai/grok-4.20-multi-agent", "Grok 4.20 Multi-Agent"),
    ],
} as const;

export const Blueprint = defineBlueprint({
    id: "Integrations.OpenRouter.Chat",
    displayName: "OpenRouter Chat",
    description: "Connect to hundreds of models via OpenRouter's unified API",
    icon: "OpenRouter",
    accent: "port-LanguageModel",
    credentials: [OpenRouter],
    fields: [
        defineField.MultiOption("provider", "Provider", {
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
        defineField.Float("temperature", "Temperature", {
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values make output more random."
        }),
        defineField.Integer("maxTokens", "Max Tokens", {
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate."
        }),
        defineField.Float("topP", "Top P", {
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
        defineOutput.LanguageModel("languageModel", "Language Model", {
            tooltip: "The OpenRouter language model instance."
        })
    ],

    "provider==Anthropic": {
        fields: [defineField.MultiOption("anthropicModel", "Model", {
            options: MODELS.Anthropic,
            initialValue: "anthropic/claude-opus-5",
        })],
    },
    "provider==Google": {
        fields: [defineField.MultiOption("googleModel", "Model", {
            options: MODELS.Google,
            initialValue: "google/gemini-3.1-pro-preview",
        })],
    },
    "provider==OpenAI": {
        fields: [defineField.MultiOption("openAIModel", "Model", {
            options: MODELS.OpenAI,
            initialValue: "openai/gpt-5.6-terra",
        })],
    },
    "provider==Meta": {
        fields: [defineField.MultiOption("metaModel", "Model", {
            options: MODELS.Meta,
            initialValue: "meta-llama/llama-4-maverick",
        })],
    },
    "provider==DeepSeek": {
        fields: [defineField.MultiOption("deepSeekModel", "Model", {
            options: MODELS.DeepSeek,
            initialValue: "deepseek/deepseek-v4-pro",
        })],
    },
    "provider==Mistral": {
        fields: [defineField.MultiOption("mistralModel", "Model", {
            options: MODELS.Mistral,
            initialValue: "mistralai/mistral-small-2603",
        })],
    },
    "provider==Cohere": {
        fields: [defineField.MultiOption("cohereModel", "Model", {
            options: MODELS.Cohere,
            initialValue: "cohere/command-a",
        })],
    },
    "provider==xAI": {
        fields: [defineField.MultiOption("xaiModel", "Model", {
            options: MODELS.xAI,
            initialValue: "x-ai/grok-4.6",
        })],
    },
});
