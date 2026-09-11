import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const Alpaca = defineCredential({
    id: "alpacaApi",
    displayName: "Alpaca",
    icon: "Alpaca",
    fields: [
        defineField.Password("apiKeyId", "API Key ID", {
            required: true
        }),
        defineField.Password("apiSecret", "API Secret", {
            required: true
        }),
        defineField.MultiOption("environment", "Trading Environment", {
            options: [
                { value: "paper", displayName: "Paper" },
                { value: "live",  displayName: "Live"  },
            ],
            initialValue: "paper",
            tooltip: "Paper and live accounts use different credentials. Existing credentials without this field are treated as paper.",
        }),
    ],
})
