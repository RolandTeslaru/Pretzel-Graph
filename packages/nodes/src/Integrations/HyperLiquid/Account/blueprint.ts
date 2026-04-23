import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@vx-agent-editor/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.HyperLiquid.Account",
    displayName: "HyperLiquid Account",
    description: "Reads HyperLiquid account state for a wallet address: positions, balance, open orders, fills. Public read-only — only a wallet address is required, never a private key.",
    icon: "HyperLiquid",
    accent: "port-Json",
    toolCompatible: true,
    fields: [
        FieldBuilder.String({
            id: "defaultAddress",
            displayName: "Default Wallet Address",
            placeholder: "0x...",
            tooltip: "Optional fallback wallet address. Used when the 'address' input port is empty.",
        }),
    ],
    inputs: [
        InputBuilder.Text({
            id: "address",
            displayName: "Wallet Address",
            placeholder: "0x...",
            tooltip: "Public EVM wallet address. Read-only — no signing or private key involved. Falls back to the Default Wallet Address field if empty.",
        }),
    ],
    outputs: [
        OutputBuilder.Json({
            id: "state",
            displayName: "Clearinghouse State",
            tooltip: "Full clearinghouseState response: margin summary, asset positions, withdrawable, etc.",
        }),
        OutputBuilder.DataList({
            id: "positions",
            displayName: "Positions",
            tooltip: "Array of open positions extracted from clearinghouseState.assetPositions.",
        }),
        OutputBuilder.DataList({
            id: "openOrders",
            displayName: "Open Orders",
            tooltip: "Array of currently resting orders for the address.",
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.HyperLiquid.Account",
    displayName: "HyperLiquid Account",
    description: "Exposes HyperLiquid account-read tools to an agent. Public read-only — no private key, no trading.",
    icon: "HyperLiquid",
    accent: "port-Tool",
    toolCompatible: true,
    fields: [
        FieldBuilder.String({
            id: "defaultAddress",
            displayName: "Default Wallet Address",
            placeholder: "0x...",
            tooltip: "Optional default wallet address. The agent can override per call. If empty, the agent must always provide an address.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Tool({
            id: "getAccountState",
            displayName: "Get Account State",
            tooltip: "Tool: fetch clearinghouseState (margin, positions, withdrawable) for an address.",
        }),
        OutputBuilder.Tool({
            id: "getOpenOrders",
            displayName: "Get Open Orders",
            tooltip: "Tool: list resting orders for an address.",
        }),
        OutputBuilder.Tool({
            id: "getFills",
            displayName: "Get Fills",
            tooltip: "Tool: fetch recent fills (executed trades) for an address.",
        }),
        OutputBuilder.Tool({
            id: "getFundingHistory",
            displayName: "Get Funding History",
            tooltip: "Tool: fetch funding payments received/paid for an address.",
        }),
    ],
});
