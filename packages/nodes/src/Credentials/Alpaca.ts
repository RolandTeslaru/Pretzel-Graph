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
        FieldBuilder.MultiOption("environment", "Trading Environment", {
            options: [
                { value: "paper", displayName: "Paper" },
                { value: "live",  displayName: "Live"  },
            ],
            initialValue: "paper",
            tooltip: "Paper and live accounts use different credentials. Existing credentials without this field are treated as paper.",
        }),
    ],
})
