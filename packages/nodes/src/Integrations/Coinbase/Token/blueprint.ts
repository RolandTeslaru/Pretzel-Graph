import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Coinbase } from "@pretzel-graph/nodes/Credentials/Coinbase";

const networkOptions = [
    { value: "base-mainnet", displayName: "Base" },
    { value: "ethereum-mainnet", displayName: "Ethereum" },
    { value: "polygon-mainnet", displayName: "Polygon" },
    { value: "arbitrum-mainnet", displayName: "Arbitrum" },
    { value: "base-sepolia", displayName: "Base Sepolia (testnet)" },
] as const;

const walletFields = [
    FieldBuilder.MultiOption("networkId", "Network", {
        options: networkOptions,
        initialValue: "base-mainnet",
        tooltip: "The EVM network your wallet operates on."
    }),
    FieldBuilder.String("walletAddress", "Wallet Address", {
        placeholder: "0x... (leave empty to create a new wallet)",
        tooltip: "Optional. Load an existing CDP wallet by its EVM address. If empty, a new wallet is created."
    }),
] as const;


export const Blueprint = defineBlueprint({
    id: "Integrations.Coinbase.Token",
    credentials: [Coinbase],
    displayName: "ERC-20 Token",
    description: "Read ERC-20 token balances and allowances, or transfer and approve tokens using a Coinbase-managed CDP wallet.",
    icon: "Coinbase",
    accent: "port-Json",
    toolCompatible: true,
    fields: [
        ...walletFields,
        FieldBuilder.String("tokenAddress", "Token Address", {
            placeholder: "0x... (leave empty for native ETH)",
            tooltip: "ERC-20 contract address. Leave empty to query native ETH/MATIC balance."
        }),
        FieldBuilder.String("targetAddress", "Target Address", {
            placeholder: "0x... (defaults to wallet address)",
            tooltip: "Address to check the balance for. Defaults to the node's own wallet address."
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data("balance", "Balance", {
            tooltip: "Token balance as a number."
        }),
        OutputBuilder.Json("data", "Full Response", {
            tooltip: "Complete balance response including token metadata."
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Coinbase.Token",
    credentials: [Coinbase],
    displayName: "ERC-20 Token",
    description: "Exposes ERC-20 token tools to an agent via a Coinbase-managed CDP wallet.",
    icon: "Coinbase",
    accent: "port-Tool",
    toolCompatible: true,
    fields: [...walletFields],
    inputs: [],
    outputs: [
        OutputBuilder.Tool("getBalance", "Get Balance", {
            tooltip: "Tool: get the token balance for an address."
        }),
        OutputBuilder.Tool("transfer", "Transfer", {
            tooltip: "Tool: transfer tokens to another address."
        }),
        OutputBuilder.Tool("approve", "Approve", {
            tooltip: "Tool: approve a spender to use tokens on behalf of the wallet."
        }),
        OutputBuilder.Tool("getAllowance", "Get Allowance", {
            tooltip: "Tool: check how much a spender is approved to use."
        }),
        OutputBuilder.Tool("getTokenAddress", "Get Token Address", {
            tooltip: "Tool: look up a token's contract address by its symbol."
        }),
    ],
});
