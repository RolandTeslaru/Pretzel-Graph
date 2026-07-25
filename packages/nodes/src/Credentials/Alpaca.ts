import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Alpaca = defineCredential({
    id: "alpacaApi",
    displayName: "Alpaca",
    icon: "Alpaca",
    fields: [
        FieldBuilder.Password("apiKeyId", "API Key ID", {
            required: true
        }),
        FieldBuilder.Password("apiSecret", "API Secret", {
            required: true
        }),
    ],
})
