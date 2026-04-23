import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.Uniswap.Swap",
    displayName: "Uniswap",
    description: "Provides Uniswap tools for token swapping on EVM chains. Exposes check_approval, get_quote and swap_tokens as a tool list for agents. Requires a Uniswap API key and an EVM private key for signing transactions.",
    icon: "Uniswap",
    accent: "port-ToolList",
    fields: [
        FieldBuilder.Secret({
            id: "uniswapApiKey",
            displayName: "Uniswap API Key",
            tooltip: "API key for the Uniswap Trading API.",
        }),
        FieldBuilder.Secret({
            id: "privateKey",
            displayName: "EVM Private Key",
            tooltip: "Private key used to sign approvals and swap transactions. Never stored outside the workflow vault.",
        }),

        
        FieldBuilder.MultiOption({
            id: "chain",
            displayName: "Chain",
            options: [
                { value: "1", displayName: "Ethereum" },
                { value: "137", displayName: "Polygon" },
                { value: "42161", displayName: "Arbitrum" },
                { value: "8453", displayName: "Base" },
                { value: "10", displayName: "Optimism" },
                { value: "43114", displayName: "Avalanche" },
                { value: "42220", displayName: "Celo" },
            ],
            initialValue: "1",
            tooltip: "The EVM chain to operate on.",
        }),
        FieldBuilder.String({
            id: "rpcUrl",
            displayName: "RPC URL",
            placeholder: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
            tooltip: "Custom RPC endpoint. If empty, uses the default public transport for the selected chain.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.ToolList({
            id: "tools",
            displayName: "Uniswap Tools",
            tooltip: "3 tools: uniswap_check_approval, uniswap_get_quote, uniswap_swap_tokens.",
        }),
    ],
});
