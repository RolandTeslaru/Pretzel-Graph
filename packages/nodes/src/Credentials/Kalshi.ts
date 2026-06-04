import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Kalshi = defineCredential({
    id: "kalshiApi",
    displayName: "Kalshi",
    icon: "Kalshi",
    fields: [
        FieldBuilder.Password({ id: "apiKeyId", displayName: "API Key ID", required: true }),
        FieldBuilder.Password({ id: "privateKeyPem", displayName: "RSA Private Key (PEM)", required: true }),
    ],
})
