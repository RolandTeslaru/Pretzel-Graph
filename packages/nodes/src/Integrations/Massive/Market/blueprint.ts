import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Massive } from "@pretzel-graph/nodes/Credentials/Massive";

const timespanOptions = [
    { value: "minute", displayName: "Minute" },
    { value: "hour", displayName: "Hour" },
    { value: "day", displayName: "Day" },
] as const;

export const Blueprint = defineBlueprint({
    id: "Integrations.Massive.Market",
    credentials: [Massive],
    displayName: "Massive Market",
    description: "Reads US stock market data from Massive (formerly Polygon.io): candle history, snapshots, and ticker search. Requires an API key.",
    icon: "Massive",
    accent: "port-DataList",
    toolCompatible: true,
    fields: [
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
    credentials: [Massive],
    displayName: "Massive Market",
    description: "Exposes Massive (Polygon.io) stock-market data tools to an agent.",
    icon: "Massive",
    accent: "port-ToolList",
    toolCompatible: true,
    fields: [
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
        OutputBuilder.ToolList({
            id: "tools",
            displayName: "Massive Tools",
            tooltip: "Toolkit: massive_get_candles, massive_get_news, massive_get_snapshot, massive_get_last_trade, massive_get_last_quote, massive_get_ticker_details, massive_search_tickers.",
        }),
    ],
});
