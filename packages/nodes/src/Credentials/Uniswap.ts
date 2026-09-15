import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const Uniswap = defineCredential({
    id: "uniswapApi",
    displayName: "Uniswap",
    icon: "Uniswap",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Uniswap Trading API key."
        }),
        defineField.Password("privateKey", "EVM Private Key", {
            required: true,
            tooltip: "Private key used to sign approvals and swap transactions."
        }),
    ],
})
