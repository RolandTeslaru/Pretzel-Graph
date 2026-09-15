import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const Anthropic = defineCredential({
    id: "anthropicApi",
    displayName: "Anthropic",
    icon: "Anthropic",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true
        }),
    ],
})
