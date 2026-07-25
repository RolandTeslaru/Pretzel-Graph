import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Massive } from "@pretzel-graph/nodes/Credentials/Massive";

const timespanOptions = [
    { value: "minute", displayName: "Minute" },
    { value: "hour", displayName: "Hour" },
    { value: "day", displayName: "Day" },
] as const;

const actionOptions = [
    { value: "candles", displayName: "Candles — OHLCV history" },
    { value: "snapshot", displayName: "Snapshot — live price & day metrics" },
    { value: "details", displayName: "Details — company reference data" },
    { value: "financials", displayName: "Financials — revenue, earnings, balance sheet" },
    { value: "marketStatus", displayName: "Market Status — open / closed" },
] as const;

export const Blueprint = defineBlueprint({
    id: "Integrations.Massive.Market",
    credentials: [Massive],
    displayName: "Massive Market",
    description: "Reads US stock market data from Massive (formerly Polygon.io): candle history, snapshots, and ticker search.",
    icon: "Massive",
    proxyCompatible: true,
    accent: "port-DataList",
    toolCompatible: true,
    fields: [
        // action drives the field schema + output ports via reconcile. Base is the `candles`
        // case; snapshot / details / marketStatus need no extra fields.
        FieldBuilder.reconciling(FieldBuilder.MultiOption("action", "Action", {
            options: actionOptions,
            initialValue: "candles",
            tooltip: "What to fetch for the ticker."
        })),
    ],
    inputs: [
        InputBuilder.Text("ticker", "Ticker", {
            required: true,
            placeholder: "AAPL",
            tooltip: "US stock ticker symbol (e.g. AAPL, MSFT, TSLA). Unused by the Market Status action."
        }),
    ],
    outputs: [
        OutputBuilder.DataList("candles", "Candles", {
            tooltip: "Array of OHLCV aggregates (bars) returned by Massive."
        }),
        OutputBuilder.Data("summary", "Summary", {
            tooltip: "Convenience summary: { ticker, timespan, multiplier, count, firstClose, lastClose, change, changePct }."
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Massive.Market",
    credentials: [Massive],
    displayName: "Massive Market",
    description: "Exposes Massive (Polygon.io) stock-market data tools to an agent.",
    icon: "Massive",
    proxyCompatible: true,
    accent: "port-ToolList",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption("timespan", "Default Timespan", {
            options: timespanOptions,
            initialValue: "minute",
            tooltip: "Default timespan used by getCandles when the agent doesn't specify one."
        }),
        FieldBuilder.Integer("multiplier", "Default Multiplier", {
            initialValue: 1,
            min: 1,
            max: 60,
            tooltip: "Default multiplier used by getCandles when the agent doesn't specify one."
        }),
        FieldBuilder.Integer("lookbackHours", "Default Lookback (hours)", {
            initialValue: 24,
            min: 1,
            max: 24 * 365,
            tooltip: "Default lookback used by getCandles when the agent doesn't specify one."
        }),
        FieldBuilder.Boolean("adjusted", "Adjusted", {
            initialValue: true,
            tooltip: "Whether to request adjusted data for aggregates when supported by the API.",
            advanced: true
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.ToolList("tools", "Massive Tools", {
            tooltip: "Toolkit: massive_get_candles, massive_get_news, massive_get_snapshot, massive_get_last_trade, massive_get_last_quote, massive_get_ticker_details, massive_search_tickers, massive_get_financials, massive_get_market_status."
        }),
    ],
});
