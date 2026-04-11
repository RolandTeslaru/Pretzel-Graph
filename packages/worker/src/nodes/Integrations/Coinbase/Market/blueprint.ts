import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Integrations.Coinbase.Market",
    displayName: "DeFi Market Data",
    description: "Fetches live DeFi market data. Pyth for real-time asset prices, DeFiLlama for protocol TVL and analytics. No API key required.",
    icon: "Coinbase",
    accent: "port-Json",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "dataSource",
            displayName: "Data Source",
            options: [
                { value: "pyth", displayName: "Pyth — Asset Price" },
                { value: "defillama", displayName: "DeFiLlama — Protocol TVL" },
            ],
            initialValue: "pyth",
            tooltip: "Pyth returns live price data for crypto assets. DeFiLlama returns TVL and chain breakdown for DeFi protocols.",
        }),
    ],
    inputs: [
        InputBuilder.Text({
            id: "query",
            displayName: "Query",
            required: true,
            placeholder: "BTC  or  uniswap",
            tooltip: "For Pyth: a coin symbol (e.g. BTC, ETH, SOL). For DeFiLlama: a protocol slug (e.g. uniswap, aave, curve).",
        }),
    ],
    outputs: [
        OutputBuilder.Data({
            id: "price",
            displayName: "Price (USD)",
            tooltip: "Numeric USD price. Only populated when Data Source is Pyth.",
        }),
        OutputBuilder.Json({
            id: "data",
            displayName: "Full Data",
            tooltip: "Complete parsed response from the selected data source.",
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Coinbase.Market",
    displayName: "DeFi Market Data",
    description: "Exposes DeFi market data tools to an agent. No API key required.",
    icon: "Coinbase",
    accent: "port-Tool",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "dataSource",
            displayName: "Data Source",
            options: [
                { value: "pyth", displayName: "Pyth — Asset Price" },
                { value: "defillama", displayName: "DeFiLlama — Protocol TVL" },
            ],
            initialValue: "pyth",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Tool({
            id: "getPrice",
            displayName: "Get Price",
            tooltip: "Tool: fetch the live USD price for a crypto asset from Pyth.",
        }),
        OutputBuilder.Tool({
            id: "getProtocolData",
            displayName: "Get Protocol Data",
            tooltip: "Tool: fetch TVL, chain breakdown, and metadata for a DeFi protocol from DeFiLlama.",
        }),
        OutputBuilder.Tool({
            id: "searchAsset",
            displayName: "Search Asset",
            tooltip: "Tool: search Pyth price feeds by keyword and return matching assets with their IDs.",
        }),
    ],
});
