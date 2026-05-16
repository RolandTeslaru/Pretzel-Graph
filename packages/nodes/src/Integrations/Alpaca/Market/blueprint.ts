import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Alpaca } from "@pretzel-graph/nodes/Credentials/Alpaca";

const envOptions = [
    { value: "live", displayName: "Live" },
    { value: "paper", displayName: "Paper" },
] as const;

const timespanOptions = [
    { value: "minute", displayName: "Minute" },
    { value: "hour", displayName: "Hour" },
    { value: "day", displayName: "Day" },
] as const;

export const Blueprint = defineBlueprint({
    id: "Integrations.Alpaca.Market",
    credentials: [Alpaca],
    displayName: "Alpaca Market",
    description: "Reads US stock market data and news from Alpaca Market Data APIs.",
    icon: "Alpaca",
    accent: "port-DataList",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "environment",
            displayName: "Environment",
            options: envOptions,
            initialValue: "live",
            tooltip: "Used for trading endpoints (assets). Market data endpoints are the same for both.",
            advanced: true,
        }),
        FieldBuilder.MultiOption({
            id: "timespan",
            displayName: "Timespan",
            options: timespanOptions,
            initialValue: "minute",
            tooltip: "Default bars granularity.",
        }),
        FieldBuilder.Integer({
            id: "multiplier",
            displayName: "Multiplier",
            initialValue: 1,
            min: 1,
            max: 60,
            tooltip: "Default bars multiplier (e.g. 5 + minute = 5Min).",
        }),
        FieldBuilder.Integer({
            id: "lookbackHours",
            displayName: "Lookback (hours)",
            initialValue: 24,
            min: 1,
            max: 24 * 365,
            tooltip: "Default how far back to fetch bars.",
        }),
        FieldBuilder.Integer({
            id: "maxBars",
            displayName: "Max Bars",
            initialValue: 500,
            min: 1,
            max: 5000,
            tooltip: "Safety cap to prevent huge outputs. Tools can override.",
            advanced: true,
        }),
    ],
    inputs: [
        InputBuilder.Text({
            id: "symbol",
            displayName: "Symbol",
            required: true,
            placeholder: "AAPL",
            tooltip: "US stock symbol (e.g. AAPL, MSFT).",
        }),
    ],
    outputs: [
        OutputBuilder.DataList({
            id: "bars",
            displayName: "Bars",
            tooltip: "Array of OHLCV bars (limited by Max Bars).",
        }),
        OutputBuilder.Json({
            id: "summary",
            displayName: "Summary",
            tooltip: "Convenience summary about the returned bars.",
        }),
        OutputBuilder.Json({
            id: "news",
            displayName: "News",
            tooltip: "Recent news for the symbol (compact).",
        }),
    ],
});

export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Alpaca.Market",
    credentials: [Alpaca],
    displayName: "Alpaca Market",
    description: "Exposes Alpaca market data and news tools to an agent.",
    icon: "Alpaca",
    accent: "port-Tool",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "environment",
            displayName: "Environment",
            options: envOptions,
            initialValue: "live",
            tooltip: "Used for trading endpoints (assets). Market data endpoints are the same for both.",
            advanced: true,
        }),
        FieldBuilder.MultiOption({
            id: "timespan",
            displayName: "Default Timespan",
            options: timespanOptions,
            initialValue: "minute",
        }),
        FieldBuilder.Integer({
            id: "multiplier",
            displayName: "Default Multiplier",
            initialValue: 1,
            min: 1,
            max: 60,
        }),
        FieldBuilder.Integer({
            id: "lookbackHours",
            displayName: "Default Lookback (hours)",
            initialValue: 24,
            min: 1,
            max: 24 * 365,
        }),
        FieldBuilder.Integer({
            id: "maxBars",
            displayName: "Default Max Bars",
            initialValue: 500,
            min: 1,
            max: 5000,
            advanced: true,
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Tool({
            id: "getBars",
            displayName: "Get Bars",
            tooltip: "Tool: fetch OHLCV bars for a symbol.",
        }),
        OutputBuilder.Tool({
            id: "getLatestTrade",
            displayName: "Get Latest Trade",
            tooltip: "Tool: fetch the latest trade for a symbol.",
        }),
        OutputBuilder.Tool({
            id: "getLatestQuote",
            displayName: "Get Latest Quote",
            tooltip: "Tool: fetch the latest quote for a symbol.",
        }),
        OutputBuilder.Tool({
            id: "getNews",
            displayName: "Get News",
            tooltip: "Tool: fetch recent news for a symbol.",
        }),
        OutputBuilder.Tool({
            id: "searchAssets",
            displayName: "Search Assets",
            tooltip: "Tool: list/search tradable assets (symbol/name substring match).",
        }),
    ],
});
