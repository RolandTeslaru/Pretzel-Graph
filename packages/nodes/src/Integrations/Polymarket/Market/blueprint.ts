import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

const statusOptions = [
    { value: "active", displayName: "Active" },
    { value: "closed", displayName: "Closed" },
    { value: "all", displayName: "All" },
] as const;

export const Blueprint = defineBlueprint({
    id: "Integrations.Polymarket.Market",
    displayName: "Polymarket Market",
    description: "Reads Polymarket prediction-market data: events, markets, prices and order books (Gamma + CLOB). No API key required.",
    icon: "Polymarket",
    accent: "port-DataList",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "status",
            displayName: "Status",
            options: statusOptions,
            initialValue: "active",
            tooltip: "Filter markets by status. Used in direct mode and as the default for the search tool.",
        }),
        FieldBuilder.Integer({
            id: "maxResults",
            displayName: "Max Results",
            initialValue: 20,
            min: 1,
            max: 500,
            tooltip: "Maximum number of markets to return.",
        }),
    ],
    inputs: [
        InputBuilder.Text({
            id: "query",
            displayName: "Query",
            placeholder: "election",
            tooltip: "Substring to match against market question / slug. Leave empty to list top markets by volume.",
        }),
    ],
    outputs: [
        OutputBuilder.DataList({
            id: "markets",
            displayName: "Markets",
            tooltip: "Array of markets: { id, question, slug, conditionId, outcomes, outcomePrices, clobTokenIds, volume, liquidity, endDate }.",
        }),
        OutputBuilder.Json({
            id: "summary",
            displayName: "Summary",
            tooltip: "Convenience summary: { query, status, count, top }.",
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Polymarket.Market",
    displayName: "Polymarket Market",
    description: "Exposes Polymarket market-data tools to an agent as a toolkit. Read-only — no API key required.",
    icon: "Polymarket",
    accent: "port-ToolList",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "status",
            displayName: "Default Status",
            options: statusOptions,
            initialValue: "active",
            tooltip: "Default status filter used by the search tool when the agent doesn't specify one.",
        }),
        FieldBuilder.Integer({
            id: "maxResults",
            displayName: "Default Max Results",
            initialValue: 20,
            min: 1,
            max: 500,
            tooltip: "Default result cap used by the list/search tools when the agent doesn't specify one.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.ToolList({
            id: "tools",
            displayName: "Polymarket Tools",
            tooltip: "Toolkit: polymarket_search_markets, polymarket_get_market, polymarket_get_events, polymarket_get_midpoint, polymarket_get_order_book.",
        }),
    ],
});
