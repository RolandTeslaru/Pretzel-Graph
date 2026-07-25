import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const xAI = defineCredential({
    id: "xAiApi",
    displayName: "xAI",
    icon: "xAI",
    fields: [
        FieldBuilder.Password("apiKey", "API Key", {
            required: true
        }),
    ],
})
