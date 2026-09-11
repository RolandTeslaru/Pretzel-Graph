import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const xAI = defineCredential({
    id: "xAiApi",
    displayName: "xAI",
    icon: "xAI",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true
        }),
    ],
})
