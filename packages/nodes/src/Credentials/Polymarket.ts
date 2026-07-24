import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

const signatureTypes = [
    { value: "0", displayName: "EOA" },
    { value: "1", displayName: "Polymarket Proxy" },
    { value: "2", displayName: "Gnosis Safe" },
    { value: "3", displayName: "Smart-Contract Wallet (EIP-1271)" },
] as const

export const Polymarket = defineCredential({
    id:          "polymarketApi",
    displayName: "Polymarket",
    icon:        "Polymarket",
    fields: [
        FieldBuilder.Password({
            id:          "privateKey",
            displayName: "Wallet Private Key",
            required:    true,
            tooltip:     "Private key used locally to sign Polymarket authentication messages and orders.",
        }),
        FieldBuilder.String({
            id:          "funderAddress",
            displayName: "Funder Address",
            required:    true,
            placeholder: "0x…",
            tooltip:     "The Polymarket proxy, Safe, or smart-contract wallet that holds the funds.",
        }),
        FieldBuilder.MultiOption({
            id:           "signatureType",
            displayName:  "Wallet Type",
            options:      signatureTypes,
            initialValue: "3",
            tooltip:      "How Polymarket verifies order signatures. New Polymarket deposit wallets normally use EIP-1271.",
        }),
        FieldBuilder.Password({
            id:          "apiKey",
            displayName: "CLOB API Key",
            required:    true,
            advanced:    true,
            tooltip:     "L2 API key used to authenticate CLOB requests.",
        }),
        FieldBuilder.Password({
            id:          "apiSecret",
            displayName: "CLOB API Secret",
            required:    true,
            advanced:    true,
            tooltip:     "L2 secret used locally to create HMAC request signatures.",
        }),
        FieldBuilder.Password({
            id:          "passphrase",
            displayName: "CLOB Passphrase",
            required:    true,
            advanced:    true,
            tooltip:     "L2 API passphrase.",
        }),
    ],
})
