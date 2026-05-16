import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Coinbase = defineCredential({
    id: "coinbaseApi",
    displayName: "Coinbase",
    icon: "Coinbase",
    fields: [
        FieldBuilder.String({ id: "cdpKeyId", displayName: "CDP Key ID", required: true, initialValue: "", tooltip: "Coinbase Developer Platform API key ID. Not sensitive on its own." }),
        FieldBuilder.Password({ id: "cdpKeySecret", displayName: "CDP Key Secret", required: true, tooltip: "Coinbase Developer Platform API key secret." }),
        FieldBuilder.Password({ id: "walletSecret", displayName: "Wallet Secret", required: true, tooltip: "CDP wallet encryption secret." }),
    ],
})
