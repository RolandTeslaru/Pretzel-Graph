import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Anthropic = defineCredential({
    id: "anthropicApi",
    displayName: "Anthropic",
    icon: "Anthropic",
    fields: [
        FieldBuilder.Password("apiKey", "API Key", {
            required: true
        }),
    ],
})
