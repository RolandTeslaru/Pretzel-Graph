import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const GoogleGemini = defineCredential({
    id: "googleGeminiApi",
    displayName: "Google Gemini",
    icon: "GoogleGemini",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Google AI Studio API key."
        }),
    ],
})
