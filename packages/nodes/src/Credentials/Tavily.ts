import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const Tavily = defineCredential({
    id: "tavilyApi",
    displayName: "Tavily",
    icon: "Tavily",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true
        }),
    ],
})
