import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Alpaca = defineCredential({
    id: "alpacaApi",
    displayName: "Alpaca",
    icon: "Alpaca",
    fields: [
        FieldBuilder.Password({ id: "apiKeyId", displayName: "API Key ID", required: true }),
        FieldBuilder.Password({ id: "apiSecret", displayName: "API Secret", required: true }),
    ],
})
