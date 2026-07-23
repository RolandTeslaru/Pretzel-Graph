import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

const statusOptions = [
    { value: "active", displayName: "Active (open)" },
    { value: "closed", displayName: "Closed" },
    { value: "all", displayName: "All" },
] as const;

export const Blueprint = defineBlueprint({
    id: "Integrations.Kalshi.Market",
    displayName: "Kalshi Market",
    description: "Reads Kalshi prediction-market data: events, markets and order books.",
    icon: "Kalshi",
    proxyCompatible: true,
    accent: "port-DataList",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "status",
            displayName: "Status",
            options: statusOptions,
            initialValue: "active",
            tooltip: "Filter markets by status. Used in direct mode and as the default for the tools.",
        }),
        FieldBuilder.Integer({
            id: "maxResults",
            displayName: "Max Results",
            initialValue: 20,
            min: 1,
            max: 1000,
            tooltip: "Maximum number of markets/events to return.",
        }),
    ],
    inputs: [
        InputBuilder.Text({
            id: "eventTicker",
            displayName: "Event Ticker",
            placeholder: "KXPRES-24",
            tooltip: "Optional Kalshi event ticker to scope markets to one event. Leave empty to list markets by status.",
        }),
    ],
    outputs: [
        OutputBuilder.DataList({
            id: "markets",
            displayName: "Markets",
            tooltip: "Array of Kalshi markets: { ticker, event_ticker, title, status, yes_bid_dollars, yes_ask_dollars, last_price_dollars, volume_fp, close_time, ... }.",
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Kalshi.Market",
    displayName: "Kalshi Market",
    description: "Exposes Kalshi market-data tools to an agent as a toolkit.",
    icon: "Kalshi",
    proxyCompatible: true,
    accent: "port-ToolList",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "status",
            displayName: "Default Status",
            options: statusOptions,
            initialValue: "active",
            tooltip: "Default status filter used by the tools when the agent doesn't specify one.",
        }),
        FieldBuilder.Integer({
            id: "maxResults",
            displayName: "Default Max Results",
            initialValue: 20,
            min: 1,
            max: 1000,
            tooltip: "Default result cap used by the tools when the agent doesn't specify one.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.ToolList({
            id: "tools",
            displayName: "Kalshi Tools",
            tooltip: "Toolkit: kalshi_get_markets, kalshi_get_market, kalshi_get_events, kalshi_get_orderbook.",
        }),
    ],
});
