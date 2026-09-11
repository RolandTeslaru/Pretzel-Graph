import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const Massive = defineCredential({
    id: "massiveApi",
    displayName: "Massive",
    icon: "Massive",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Massive (Polygon.io) API key."
        }),
    ],
})
