import { defineBlueprint, defineField, defineOutput } from "@pretzel-graph/node-sdk";
import { Uniswap } from "@pretzel-graph/nodes/Credentials/Uniswap";

export const Blueprint = defineBlueprint({
    id: "Integrations.Uniswap.Swap",
    displayName: "Uniswap",
    description: "Provides Uniswap tools for token swapping on EVM chains. Exposes check_approval, get_quote and swap_tokens as a tool list for agents.",
    icon: "Uniswap",
    proxyCompatible: true,
    accent: "port-ToolList",
    credentials: [Uniswap],
    fields: [

        
        defineField.MultiOption("chain", "Chain", {
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
            tooltip: "The EVM chain to operate on."
        }),
        defineField.String("rpcUrl", "RPC URL", {
            placeholder: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
            tooltip: "Custom RPC endpoint. If empty, uses the default public transport for the selected chain."
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.ToolList("tools", "Uniswap Tools", {
            tooltip: "3 tools: uniswap_check_approval, uniswap_get_quote, uniswap_swap_tokens."
        }),
    ],
});
