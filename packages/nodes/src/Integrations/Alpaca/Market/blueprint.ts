import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
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
    proxyCompatible: true,
    accent: "port-DataList",
    toolCompatible: true,
    fields: [
        FieldBuilder.String("symbol", "Symbol", {
            required: true,
            placeholder: "AAPL",
            tooltip: "US stock symbol (e.g. AAPL, MSFT)."
        }),
        FieldBuilder.MultiOption("environment", "Environment", {
            options: envOptions,
            initialValue: "live",
            tooltip: "Used for trading endpoints (assets). Market data endpoints are the same for both.",
            advanced: true
        }),
        FieldBuilder.MultiOption("timespan", "Timespan", {
            options: timespanOptions,
            initialValue: "minute",
            tooltip: "Default bars granularity."
        }),
        FieldBuilder.Integer("multiplier", "Multiplier", {
            initialValue: 1,
            min: 1,
            max: 60,
            tooltip: "Default bars multiplier (e.g. 5 + minute = 5Min)."
        }),
        FieldBuilder.Integer("lookbackHours", "Lookback (hours)", {
            initialValue: 24,
            min: 1,
            max: 24 * 365,
            tooltip: "Default how far back to fetch bars."
        }),
        FieldBuilder.Integer("maxBars", "Max Bars", {
            initialValue: 500,
            min: 1,
            max: 5000,
            tooltip: "Safety cap to prevent huge outputs. Tools can override.",
            advanced: true
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.DataList("bars", "Bars", {
            tooltip: "Array of OHLCV bars (limited by Max Bars)."
        }),
        OutputBuilder.Json("summary", "Summary", {
            tooltip: "Convenience summary about the returned bars."
        }),
        OutputBuilder.Json("news", "News", {
            tooltip: "Recent news for the symbol (compact)."
        }),
    ],
});

export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Alpaca.Market",
    credentials: [Alpaca],
    displayName: "Alpaca Market",
    description: "Exposes Alpaca market data and news tools to an agent.",
    icon: "Alpaca",
    proxyCompatible: true,
    accent: "port-ToolList",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption("environment", "Environment", {
            options: envOptions,
            initialValue: "live",
            tooltip: "Used for trading endpoints (assets). Market data endpoints are the same for both.",
            advanced: true
        }),
        FieldBuilder.MultiOption("timespan", "Default Timespan", {
            options: timespanOptions,
            initialValue: "minute"
        }),
        FieldBuilder.Integer("multiplier", "Default Multiplier", {
            initialValue: 1,
            min: 1,
            max: 60
        }),
        FieldBuilder.Integer("lookbackHours", "Default Lookback (hours)", {
            initialValue: 24,
            min: 1,
            max: 24 * 365
        }),
        FieldBuilder.Integer("maxBars", "Default Max Bars", {
            initialValue: 500,
            min: 1,
            max: 5000,
            advanced: true
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.ToolList("tools", "Alpaca Tools", {
            tooltip: "Toolkit: alpaca_get_bars, alpaca_get_latest_trade, alpaca_get_latest_quote, alpaca_get_news, alpaca_search_assets."
        }),
    ],
});
