"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Uniswap_1 = require("../../../Credentials/Uniswap");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Uniswap.Swap",
    displayName: "Uniswap",
    description: "Provides Uniswap tools for token swapping on EVM chains. Exposes check_approval, get_quote and swap_tokens as a tool list for agents.",
    icon: "Uniswap",
    proxyCompatible: true,
    accent: "port-ToolList",
    credentials: [Uniswap_1.Uniswap],
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("chain", "Chain", {
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
        node_sdk_1.FieldBuilder.String("rpcUrl", "RPC URL", {
            placeholder: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
            tooltip: "Custom RPC endpoint. If empty, uses the default public transport for the selected chain."
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.ToolList("tools", "Uniswap Tools", {
            tooltip: "3 tools: uniswap_check_approval, uniswap_get_quote, uniswap_swap_tokens."
        }),
    ],
});
