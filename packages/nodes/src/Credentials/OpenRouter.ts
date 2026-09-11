import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const OpenRouter = defineCredential({
    id: "openRouterApi",
    displayName: "OpenRouter",
    icon: "OpenRouter",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true
        }),
    ],
})
