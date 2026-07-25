import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Tavily = defineCredential({
    id: "tavilyApi",
    displayName: "Tavily",
    icon: "Tavily",
    fields: [
        FieldBuilder.Password("apiKey", "API Key", {
            required: true
        }),
    ],
})
