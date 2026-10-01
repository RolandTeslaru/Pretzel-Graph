import { defineField, defineBlueprint, defineOutput } from "@pretzel-graph/node-sdk";
import { VercelAIGateway } from "@pretzel-graph/nodes/Credentials/VercelAIGateway";
import { MODELS } from "./models";

export const Blueprint = defineBlueprint({
    id: "Integrations.Vercel.AIGateway",
    displayName: "Vercel AI Gateway",
    description: "Connect to models from every major provider through Vercel AI Gateway",
    icon: "Vercel",
    accent: "port-LanguageModel",
    credentials: [VercelAIGateway],
    fields: [
        defineField.MultiOption("provider", "Provider", {
            options: [
                { value: "Anthropic" },
                { value: "Google" },
                { value: "OpenAI" },
                { value: "Meta" },
                { value: "DeepSeek" },
                { value: "Alibaba", displayName: "Alibaba (Qwen)" },
                { value: "Moonshot", displayName: "Moonshot AI (Kimi)" },
                { value: "ZAI", displayName: "Z.ai (GLM)" },
                { value: "Mistral" },
                { value: "Cohere" },
                { value: "xAI" },
            ],
            initialValue: "Google",
            tooltip: "Filter the model list by provider."
        }),
        defineField.MultiOption("reasoningEffort", "Reasoning Effort", {
            options: [
                { value: "none", displayName: "None", description: "Answer directly, without thinking first. Fastest and cheapest." },
                { value: "low", displayName: "Low", description: "A brief pass of thinking before answering." },
                { value: "medium", displayName: "Medium", description: "Balanced thinking. A good default." },
                { value: "high", displayName: "High", description: "Extended thinking for harder problems." },
                { value: "xhigh", displayName: "Extra High", description: "Maximum thinking. Slowest and most expensive." },
            ],

            initialValue: "medium",
            tooltip: "How much the model thinks before it answers. Models without the chosen level use the closest one they offer."
        }),
        defineField.Integer("maxTokens", "Max Tokens", {
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate."
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.LanguageModel("languageModel", "Language Model", {
            tooltip: "The Vercel AI Gateway language model instance."
        })
    ],

    "provider==Anthropic": {
        fields: [defineField.MultiOption("anthropicModel", "Model", {
            options: MODELS.Anthropic,
            initialValue: "anthropic/claude-sonnet-5.5",
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
            initialValue: "meta/muse-spark-1.3",
        })],
    },
    "provider==DeepSeek": {
        fields: [defineField.MultiOption("deepSeekModel", "Model", {
            options: MODELS.DeepSeek,
            initialValue: "deepseek/deepseek-v4-pro",
        })],
    },
    "provider==Alibaba": {
        fields: [defineField.MultiOption("alibabaModel", "Model", {
            options: MODELS.Alibaba,
            initialValue: "alibaba/qwen3.8-max",
        })],
    },
    "provider==Moonshot": {
        fields: [defineField.MultiOption("moonshotModel", "Model", {
            options: MODELS.Moonshot,
            initialValue: "moonshotai/kimi-k3",
        })],
    },
    "provider==ZAI": {
        fields: [defineField.MultiOption("zaiModel", "Model", {
            options: MODELS.ZAI,
            initialValue: "zai/glm-5.3",
        })],
    },
    "provider==Mistral": {
        fields: [defineField.MultiOption("mistralModel", "Model", {
            options: MODELS.Mistral,
            initialValue: "mistral/mistral-medium-3.5",
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
            initialValue: "spacexai/grok-4.7",
        })],
    },
});
