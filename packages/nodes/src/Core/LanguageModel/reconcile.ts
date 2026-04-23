import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFields } from "@pretzel-graph/node-sdk";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFields<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {

    const fields = new Map(blueprint.fields.map(f => [f.id, f]));

    if (changedFieldId === "provider" as any) {
        const modelField = fields.get("model" as any) as unknown as Foundations.Field.MultiOption;
        const apiKeyField = fields.get("apiKey" as any) as unknown as Foundations.Field.Secret;

        if (!modelField || !apiKeyField) return blueprint;

        switch (newValue) {
            case "Anthropic":
                modelField.options = [
                    { value: "claude-opus-4-6", displayName: "Claude Opus 4.6" },
                    { value: "claude-sonnet-4-5-20250929", displayName: "Claude Sonnet 4.5" },
                    { value: "claude-haiku-4-5-20251001", displayName: "Claude Haiku 4.5" },
                ];
                modelField.initialValue = "claude-opus-4-6";
                apiKeyField.displayName = "Anthropic API Key";
                break;
            case "Google":
                modelField.options = [
                    { value: "gemini-3-pro-preview", displayName: "Gemini 3 Pro Preview" },
                    { value: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
                    { value: "gemini-3-flash-preview", displayName: "Gemini 3 Flash Preview" },
                    { value: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
                    { value: "gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite" },
                ];
                modelField.initialValue = "gemini-3-pro-preview";
                apiKeyField.displayName = "Google Generative API Key";
                break;
            case "OpenAI":
                modelField.options = [
                    { value: "gpt-4.5-preview", displayName: "GPT-4.5 Preview" },
                    { value: "gpt-4o", displayName: "GPT-4o" },
                    { value: "gpt-4o-mini", displayName: "GPT-4o Mini" },
                    { value: "o1", displayName: "o1" },
                    { value: "o1-mini", displayName: "o1-mini" },
                    { value: "o3-mini", displayName: "o3-mini" },
                    { value: "gpt-4-turbo", displayName: "GPT-4 Turbo" },
                    { value: "gpt-3.5-turbo", displayName: "GPT-3.5 Turbo" },
                ];
                modelField.initialValue = "gpt-4o";
                apiKeyField.displayName = "OpenAI API Key";
                break;
        }
    }
    return blueprint;
};
