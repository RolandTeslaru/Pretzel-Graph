import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const OpenRouter = defineCredential({
    id: "openRouterApi",
    displayName: "OpenRouter",
    icon: "OpenRouter",
    fields: [
        FieldBuilder.Password({ id: "apiKey", displayName: "API Key", required: true }),
    ],
})
