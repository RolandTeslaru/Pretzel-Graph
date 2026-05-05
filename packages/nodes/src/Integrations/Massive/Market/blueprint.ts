import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

const timespanOptions = [
    { value: "minute", displayName: "Minute" },
    { value: "hour", displayName: "Hour" },
    { value: "day", displayName: "Day" },
] as const;

export const Blueprint = defineBlueprint({
    id: "Integrations.Massive.Market",
    displayName: "Massive Market",
    description: "Reads US stock market data from Massive (formerly Polygon.io): candle history, snapshots, and ticker search. Requires an API key.",
    icon: "Massive",
    accent: "port-DataList",
    toolCompatible: true,
    fields: [
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "API Key",
            tooltip: "Your Massive (Polygon.io) API key. Falls back to MASSIVE_API_KEY or POLY_API_KEY environment variables.",
        }),
        FieldBuilder.MultiOption({
            id: "timespan",
            displayName: "Timespan",
            options: timespanOptions,
            initialValue: "minute",
            tooltip: "Candle granularity. Used in direct mode and as the default for the getCandles tool.",
        }),
        FieldBuilder.Integer({
            id: "multiplier",
            displayName: "Multiplier",
            initialValue: 1,
            min: 1,
            max: 60,
            tooltip: "Candle multiplier (e.g. 5 + minute = 5-minute candles).",
        }),
        FieldBuilder.Integer({
            id: "lookbackHours",
            displayName: "Lookback (hours)",
            initialValue: 24,
            min: 1,
            max: 24 * 365,
            tooltip: "How far back to fetch candles, in hours. The end time is always 'now'.",
        }),
        FieldBuilder.Boolean({
            id: "adjusted",
            displayName: "Adjusted",
            initialValue: true,
            tooltip: "Whether to request adjusted data for aggregates when supported by the API.",
            advanced: true,
        }),
    ],
    inputs: [
        InputBuilder.Text({
            id: "ticker",
            displayName: "Ticker",
            required: true,
            placeholder: "AAPL",
            tooltip: "US stock ticker symbol (e.g. AAPL, MSFT, TSLA).",
        }),
    ],
    outputs: [
        OutputBuilder.DataList({
            id: "candles",
            displayName: "Candles",
            tooltip: "Array of OHLCV aggregates (bars) returned by Massive.",
        }),
        OutputBuilder.Json({
            id: "summary",
            displayName: "Summary",
            tooltip: "Convenience summary: { ticker, timespan, multiplier, count, firstClose, lastClose, change, changePct }.",
        }),
        OutputBuilder.Json({
            id: "snapshot",
            displayName: "Snapshot",
            tooltip: "Snapshot for a ticker (last trade/quote + day metrics) when available.",
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Massive.Market",
    displayName: "Massive Market",
    description: "Exposes Massive (Polygon.io) stock-market data tools to an agent.",
    icon: "Massive",
    accent: "port-Tool",
    toolCompatible: true,
    fields: [
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "API Key",
            tooltip: "Your Massive (Polygon.io) API key. Falls back to MASSIVE_API_KEY or POLY_API_KEY environment variables.",
        }),
        FieldBuilder.MultiOption({
            id: "timespan",
            displayName: "Default Timespan",
            options: timespanOptions,
            initialValue: "minute",
            tooltip: "Default timespan used by getCandles when the agent doesn't specify one.",
        }),
        FieldBuilder.Integer({
            id: "multiplier",
            displayName: "Default Multiplier",
            initialValue: 1,
            min: 1,
            max: 60,
            tooltip: "Default multiplier used by getCandles when the agent doesn't specify one.",
        }),
        FieldBuilder.Integer({
            id: "lookbackHours",
            displayName: "Default Lookback (hours)",
            initialValue: 24,
            min: 1,
            max: 24 * 365,
            tooltip: "Default lookback used by getCandles when the agent doesn't specify one.",
        }),
        FieldBuilder.Boolean({
            id: "adjusted",
            displayName: "Adjusted",
            initialValue: true,
            tooltip: "Whether to request adjusted data for aggregates when supported by the API.",
            advanced: true,
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Tool({
            id: "getCandles",
            displayName: "Get Candles",
            tooltip: "Tool: download OHLCV aggregates (bars) for a ticker.",
        }),
        OutputBuilder.Tool({
            id: "getNews",
            displayName: "Get News",
            tooltip: "Tool: get recent news articles for a ticker.",
        }),
        OutputBuilder.Tool({
            id: "getSnapshot",
            displayName: "Get Snapshot",
            tooltip: "Tool: get a ticker snapshot (last trade/quote + day metrics).",
        }),
        OutputBuilder.Tool({
            id: "getLastTrade",
            displayName: "Get Last Trade",
            tooltip: "Tool: get the last trade for a ticker.",
        }),
        OutputBuilder.Tool({
            id: "getLastQuote",
            displayName: "Get Last Quote",
            tooltip: "Tool: get the last quote (NBBO) for a ticker.",
        }),
        OutputBuilder.Tool({
            id: "getTickerDetails",
            displayName: "Get Ticker Details",
            tooltip: "Tool: get reference details for a ticker.",
        }),
        OutputBuilder.Tool({
            id: "searchTickers",
            displayName: "Search Tickers",
            tooltip: "Tool: search tickers by symbol or company name.",
        }),
    ],
});
