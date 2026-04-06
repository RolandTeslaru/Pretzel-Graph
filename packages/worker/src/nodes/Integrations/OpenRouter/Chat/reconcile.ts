import { Foundations } from "@vx-agent-editor/shared/domain";
import { InferFields } from "src/types";

type ProviderEntry = {
    models: string[];
    defaultModel: string;
};

const PROVIDER_MODELS: Record<string, ProviderEntry> = {
    "Anthropic": {
        models: [
            "anthropic/claude-opus-4.6",
            "anthropic/claude-sonnet-4.6",
        ],
        defaultModel: "anthropic/claude-opus-4.6",
    },
    "Google": {
        models: [
            "google/gemini-3.1-pro-preview",
            "google/gemini-3.1-flash-lite-preview",
            "google/gemini-3-flash-preview",
            "google/gemma-4-31b-it",
        ],
        defaultModel: "google/gemini-3.1-pro-preview",
    },
    "OpenAI": {
        models: [
            "openai/gpt-5.4-pro",
            "openai/gpt-5.4",
            "openai/gpt-5.4-mini",
            "openai/gpt-5.4-nano",
            "openai/gpt-5.3-chat",
        ],
        defaultModel: "openai/gpt-5.4-pro",
    },
    "Meta": {
        models: [
            "meta-llama/llama-4-maverick-17b-128e-instruct",
            "meta-llama/llama-4-scout-17b-16e-instruct",
            "meta-llama/llama-3.3-70b-instruct",
            "meta-llama/llama-3.1-405b-instruct",
            "meta-llama/llama-3.1-70b-instruct",
        ],
        defaultModel: "meta-llama/llama-4-maverick-17b-128e-instruct",
    },
    "DeepSeek": {
        models: [
            "deepseek/deepseek-v3.2-speciale-20251201",
            "deepseek/deepseek-v3.2-20251201",
            "deepseek/deepseek-r1-0528",
            "deepseek/deepseek-r1",
            "deepseek/deepseek-chat-v3-0324",
            "deepseek/deepseek-r1-distill-llama-70b",
        ],
        defaultModel: "deepseek/deepseek-v3.2-speciale-20251201",
    },
    "Mistral": {
        models: [
            "mistralai/mistral-small-2603",
            "mistralai/mistral-small-creative",
        ],
        defaultModel: "mistralai/mistral-small-2603",
    },
    "Cohere": {
        models: [
            "cohere/command-a-03-2025",
            "cohere/command-a",
            "cohere/command-r-plus-08-2024",
            "cohere/command-r-08-2024",
            "cohere/command-r7b-12-2024",
        ],
        defaultModel: "cohere/command-a-03-2025",
    },
    "xAI": {
        models: [
            "x-ai/grok-4.20",
            "x-ai/grok-4.20-multi-agent",
        ],
        defaultModel: "x-ai/grok-4.20",
    },
};

export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFields<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    const fields = new Map(blueprint.fields.map(f => [f.id, f]));

    if (changedFieldId === "provider") {
        const modelField = fields.get("model" as any) as unknown as Foundations.Field.MultiOption;
        if (!modelField) return blueprint;

        const providerData = PROVIDER_MODELS[newValue as string] ?? PROVIDER_MODELS["Google"];
        modelField.options = providerData.models;
        modelField.initialValue = providerData.defaultModel;
    }

    return blueprint;
};
