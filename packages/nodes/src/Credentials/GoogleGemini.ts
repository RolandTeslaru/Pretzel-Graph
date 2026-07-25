import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const GoogleGemini = defineCredential({
    id: "googleGeminiApi",
    displayName: "Google Gemini",
    icon: "GoogleGemini",
    fields: [
        FieldBuilder.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Google AI Studio API key."
        }),
    ],
})
