import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const VercelAIGateway = defineCredential({
    id: "vercelAIGatewayApi",
    displayName: "Vercel AI Gateway",
    icon: "Vercel",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true
        }),
    ],
})
