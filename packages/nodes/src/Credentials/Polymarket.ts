import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

const signatureTypes = [
    { value: "0", displayName: "EOA" },
    { value: "1", displayName: "Polymarket Proxy" },
    { value: "2", displayName: "Gnosis Safe" },
    { value: "3", displayName: "Smart-Contract Wallet (EIP-1271)" },
] as const

// Polymarket authenticates at two levels, kept as separate credentials so a node can hold one
// without the other. Reading an account needs L2; signing an order needs L1. A node that only
// reads therefore never has access to the key that could trade.

/** L2 — HMAC-signs requests. Enough to read your account, and to post already-signed orders. */
export const PolymarketApiKey = defineCredential({
    id:          "polymarketApiKey",
    displayName: "Polymarket API Key",
    icon:        "Polymarket",
    fields: [
        FieldBuilder.Password("apiKey", "CLOB API Key", {
            required: true,
            tooltip:  "L2 API key used to authenticate CLOB requests."
        }),
        FieldBuilder.Password("apiSecret", "CLOB API Secret", {
            required: true,
            tooltip:  "L2 secret used locally to create HMAC request signatures."
        }),
        FieldBuilder.Password("passphrase", "CLOB Passphrase", {
            required: true,
            tooltip:  "L2 API passphrase."
        }),
    ],
})

/** L1 — the wallet itself. Signs orders, and is what an L2 key is originally derived from. */
export const PolymarketWallet = defineCredential({
    id:          "polymarketWallet",
    displayName: "Polymarket Wallet",
    icon:        "Polymarket",
    fields: [
        FieldBuilder.Password("privateKey", "Wallet Private Key", {
            required: true,
            tooltip:  "Private key used locally to sign Polymarket authentication messages and orders."
        }),
        FieldBuilder.String("funderAddress", "Funder Address", {
            required:    true,
            placeholder: "0x…",
            tooltip:     "The Polymarket proxy, Safe, or smart-contract wallet that holds the funds."
        }),
        FieldBuilder.MultiOption("signatureType", "Wallet Type", {
            options:      signatureTypes,
            initialValue: "3",
            tooltip:      "How Polymarket verifies order signatures. New Polymarket deposit wallets normally use EIP-1271."
        }),
    ],
})
