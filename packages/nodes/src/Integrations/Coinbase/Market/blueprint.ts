import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.Coinbase.Market",
    displayName: "DeFi Market Data",
    description: "Fetches live DeFi market data: Pyth for real-time asset prices, DeFiLlama for protocol TVL and analytics.",
    icon: "Coinbase",
    accent: "port-Json",
    toolCompatible: true,
    fields: [
        FieldBuilder.String("query", "Query", {
            required: true,
            placeholder: "BTC  or  uniswap",
            tooltip: "For Pyth: a coin symbol (e.g. BTC, ETH, SOL). For DeFiLlama: a protocol slug (e.g. uniswap, aave, curve)."
        }),
        FieldBuilder.MultiOption("dataSource", "Data Source", {
            options: [
                { value: "pyth", displayName: "Pyth — Asset Price" },
                { value: "defillama", displayName: "DeFiLlama — Protocol TVL" },
            ],

            initialValue: "pyth",
            tooltip: "Pyth returns live price data for crypto assets. DeFiLlama returns TVL and chain breakdown for DeFi protocols."
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data("price", "Price (USD)", {
            tooltip: "Numeric USD price. Only populated when Data Source is Pyth."
        }),
        OutputBuilder.Data("data", "Full Data", {
            tooltip: "Complete parsed response from the selected data source."
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Coinbase.Market",
    displayName: "DeFi Market Data",
    description: "Exposes DeFi market data tools to an agent.",
    icon: "Coinbase",
    accent: "port-Tool",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption("dataSource", "Data Source", {
            options: [
                { value: "pyth", displayName: "Pyth — Asset Price" },
                { value: "defillama", displayName: "DeFiLlama — Protocol TVL" },
            ],

            initialValue: "pyth"
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Tool("getPrice", "Get Price", {
            tooltip: "Tool: fetch the live USD price for a crypto asset from Pyth."
        }),
        OutputBuilder.Tool("getProtocolData", "Get Protocol Data", {
            tooltip: "Tool: fetch TVL, chain breakdown, and metadata for a DeFi protocol from DeFiLlama."
        }),
        OutputBuilder.Tool("searchAsset", "Search Asset", {
            tooltip: "Tool: search Pyth price feeds by keyword and return matching assets with their IDs."
        }),
    ],
});
