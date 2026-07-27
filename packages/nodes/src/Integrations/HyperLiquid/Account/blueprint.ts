import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.HyperLiquid.Account",
    displayName: "HyperLiquid Account",
    description: "Reads HyperLiquid account state for a wallet address: positions, balance, open orders, fills. Public read-only — only a wallet address is required, never a private key.",
    icon: "HyperLiquid",
    proxyCompatible: true,
    accent: "port-Json",
    iconColor: "color-cyan-500",
    toolCompatible: true,
    fields: [
        FieldBuilder.String("address", "Wallet Address", {
            required: true,
            placeholder: "0x...",
            tooltip: "Public EVM wallet address. Read-only — no signing or private key involved."
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data("state", "Clearinghouse State", {
            tooltip: "Full clearinghouseState response: margin summary, asset positions, withdrawable, etc."
        }),
        OutputBuilder.DataList("positions", "Positions", {
            tooltip: "Array of open positions extracted from clearinghouseState.assetPositions."
        }),
        OutputBuilder.DataList("openOrders", "Open Orders", {
            tooltip: "Array of currently resting orders for the address."
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.HyperLiquid.Account",
    displayName: "HyperLiquid Account",
    description: "Exposes HyperLiquid account-read tools to an agent. Public read-only — no private key, no trading.",
    icon: "HyperLiquid",
    proxyCompatible: true,
    accent: "port-Tool",
    iconColor: "color-cyan-500",
    toolCompatible: true,
    fields: [
        FieldBuilder.String("address", "Default Wallet Address", {
            placeholder: "0x...",
            tooltip: "Optional default wallet address. The agent can override per call. If empty, the agent must always provide an address."
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Tool("getAccountState", "Get Account State", {
            tooltip: "Tool: fetch clearinghouseState (margin, positions, withdrawable) for an address."
        }),
        OutputBuilder.Tool("getOpenOrders", "Get Open Orders", {
            tooltip: "Tool: list resting orders for an address."
        }),
        OutputBuilder.Tool("getFills", "Get Fills", {
            tooltip: "Tool: fetch recent fills (executed trades) for an address."
        }),
        OutputBuilder.Tool("getFundingHistory", "Get Funding History", {
            tooltip: "Tool: fetch funding payments received/paid for an address."
        }),
    ],
});
