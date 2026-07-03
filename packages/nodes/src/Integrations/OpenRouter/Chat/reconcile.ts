import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

type ProviderEntry = {
    models: { value: string; displayName: string }[];
    defaultModel: string;
};

const m = (value: string, displayName: string) => ({ value, displayName });

const PROVIDER_MODELS: Record<string, ProviderEntry> = {
    "Anthropic": {
        models: [
            m("anthropic/claude-opus-4.6", "Claude Opus 4.6"),
            m("anthropic/claude-sonnet-4.6", "Claude Sonnet 4.6"),
        ],
        defaultModel: "anthropic/claude-opus-4.6",
    },
    "Google": {
        models: [
            m("google/gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview"),
            m("google/gemini-3.1-flash-lite-preview", "Gemini 3.1 Flash Lite Preview"),
            m("google/gemini-3-flash-preview", "Gemini 3 Flash Preview"),
            m("google/gemma-4-31b-it", "Gemma 4 31B IT"),
        ],
        defaultModel: "google/gemini-3.1-pro-preview",
    },
    "OpenAI": {
        models: [
            m("openai/gpt-5.4-pro", "GPT-5.4 Pro"),
            m("openai/gpt-5.4", "GPT-5.4"),
            m("openai/gpt-5.4-mini", "GPT-5.4 Mini"),
            m("openai/gpt-5.4-nano", "GPT-5.4 Nano"),
            m("openai/gpt-5.3-chat", "GPT-5.3 Chat"),
        ],
        defaultModel: "openai/gpt-5.4-pro",
    },
    "Meta": {
        models: [
            m("meta-llama/llama-4-maverick-17b-128e-instruct", "Llama 4 Maverick 17B"),
            m("meta-llama/llama-4-scout-17b-16e-instruct", "Llama 4 Scout 17B"),
            m("meta-llama/llama-3.3-70b-instruct", "Llama 3.3 70B"),
            m("meta-llama/llama-3.1-405b-instruct", "Llama 3.1 405B"),
            m("meta-llama/llama-3.1-70b-instruct", "Llama 3.1 70B"),
        ],
        defaultModel: "meta-llama/llama-4-maverick-17b-128e-instruct",
    },
    "DeepSeek": {
        models: [
            m("deepseek/deepseek-v3.2-speciale-20251201", "DeepSeek V3.2 Speciale"),
            m("deepseek/deepseek-v3.2-20251201", "DeepSeek V3.2"),
            m("deepseek/deepseek-r1-0528", "DeepSeek R1 0528"),
            m("deepseek/deepseek-r1", "DeepSeek R1"),
            m("deepseek/deepseek-chat-v3-0324", "DeepSeek Chat V3"),
            m("deepseek/deepseek-r1-distill-llama-70b", "DeepSeek R1 Distill Llama 70B"),
        ],
        defaultModel: "deepseek/deepseek-v3.2-speciale-20251201",
    },
    "Mistral": {
        models: [
            m("mistralai/mistral-small-2603", "Mistral Small 2603"),
            m("mistralai/mistral-small-creative", "Mistral Small Creative"),
        ],
        defaultModel: "mistralai/mistral-small-2603",
    },
    "Cohere": {
        models: [
            m("cohere/command-a-03-2025", "Command A 03-2025"),
            m("cohere/command-a", "Command A"),
            m("cohere/command-r-plus-08-2024", "Command R+ 08-2024"),
            m("cohere/command-r-08-2024", "Command R 08-2024"),
            m("cohere/command-r7b-12-2024", "Command R7B 12-2024"),
        ],
        defaultModel: "cohere/command-a-03-2025",
    },
    "xAI": {
        models: [
            m("x-ai/grok-4.20", "Grok 4.20"),
            m("x-ai/grok-4.20-multi-agent", "Grok 4.20 Multi-Agent"),
        ],
        defaultModel: "x-ai/grok-4.20",
    },
};

// `provider` swaps the `model` field's option list + default.
export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {
    const modelField = blueprint.fields.find(f => f.id === "model") as unknown as Foundations.Field.MultiOption | undefined;
    if (modelField) {
        const providerData = PROVIDER_MODELS[fieldValues.provider as string] ?? PROVIDER_MODELS["Google"];
        modelField.options = providerData.models;
        modelField.initialValue = providerData.defaultModel;
    }
    return blueprint;
};
