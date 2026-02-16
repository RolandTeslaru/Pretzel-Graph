import { Foundations } from "@vx-agent-editor/shared/domain";
import { Blueprint } from "./blueprint";
import { InferFields } from "src/types";
import { cloneDeep } from "lodash";

export const reconcile = (
    changedFieldId: keyof InferFields<typeof Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {

    const newBlueprint = cloneDeep(Blueprint);
    const fields = new Map(newBlueprint.fields.map(f => [f.id, f]));

    if (changedFieldId === "provider") {
        const modelField = fields.get("model" as any) as Foundations.Field.MultiOption;
        const apiKeyField = fields.get("apiKey" as any) as Foundations.Field.Secret;

        if (!modelField || !apiKeyField) return newBlueprint;

        switch (newValue) {
            case "Anthropic":
                modelField.options = [
                    "claude-opus-4-6",
                    "claude-sonnet-4-5-20250929",
                    "claude-haiku-4-5-20251001"
                ]
                modelField.initialValue = "claude-opus-4-6"
                apiKeyField.displayName = "Anthropic API Key"
                break;
            case "Google":
                modelField.options = [
                    "gemini-3-pro-preview",
                    "gemini-2.5-pro",
                    "gemini-3-flash-preview",
                    "gemini-2.5-flash",
                    "gemini-2.5-flash-lite",
                ]
                modelField.initialValue = "gemini-3-pro-preview"
                apiKeyField.displayName = "Google Generative API Key"
                break;

            case "OpenAI":
                modelField.options = [
                    "gpt-5.2",
                    "gpt-5.2-pro",
                    "gpt-5",
                    "gpt-5-mini",
                    "gpt-5-nano",
                    "gpt-4.5",
                    "o3-mini",
                    "o3",
                ]
                modelField.initialValue = "gpt-5.2"
                apiKeyField.displayName = "OpenAI API Key"
                break;
        }
    }
    return newBlueprint;
};
