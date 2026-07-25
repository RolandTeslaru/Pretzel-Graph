import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Kalshi = defineCredential({
    id: "kalshiApi",
    displayName: "Kalshi",
    icon: "Kalshi",
    fields: [
        FieldBuilder.Password("apiKeyId", "API Key ID", {
            required: true
        }),
        FieldBuilder.Password("privateKeyPem", "RSA Private Key (PEM)", {
            required: true
        }),
    ],
})
