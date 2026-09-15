import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const Kalshi = defineCredential({
    id: "kalshiApi",
    displayName: "Kalshi",
    icon: "Kalshi",
    fields: [
        defineField.Password("apiKeyId", "API Key ID", {
            required: true
        }),
        defineField.Password("privateKeyPem", "RSA Private Key (PEM)", {
            required: true
        }),
    ],
})
