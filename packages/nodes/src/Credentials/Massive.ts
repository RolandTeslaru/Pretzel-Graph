import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Massive = defineCredential({
    id: "massiveApi",
    displayName: "Massive",
    icon: "Massive",
    fields: [
        FieldBuilder.Password({ id: "apiKey", displayName: "API Key", required: true, tooltip: "Massive (Polygon.io) API key." }),
    ],
})
