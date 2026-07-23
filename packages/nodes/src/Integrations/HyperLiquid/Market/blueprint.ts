import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

const intervalOptions = [
    { value: "1m", displayName: "1 minute" },
    { value: "5m", displayName: "5 minutes" },
    { value: "15m", displayName: "15 minutes" },
    { value: "1h", displayName: "1 hour" },
    { value: "4h", displayName: "4 hours" },
    { value: "1d", displayName: "1 day" },
] as const;

export const Blueprint = defineBlueprint({
    id: "Integrations.HyperLiquid.Market",
    displayName: "HyperLiquid Market",
    description: "Reads HyperLiquid market data: candle history, order book, mid prices and asset metadata.",
    icon: "HyperLiquid",
    proxyCompatible: true,
    accent: "port-DataList",
    iconColor: "color-cyan-500",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "interval",
            displayName: "Interval",
            options: intervalOptions,
            initialValue: "1h",
            tooltip: "Candle interval. Used in direct mode and as the default for the getCandles tool.",
        }),
        FieldBuilder.Integer({
            id: "lookbackHours",
            displayName: "Lookback (hours)",
            initialValue: 24,
            min: 1,
            max: 24 * 365,
            tooltip: "How far back to fetch candles, in hours. The end time is always 'now'.",
        }),
    ],
    inputs: [
        InputBuilder.Text({
            id: "coin",
            displayName: "Coin",
            required: true,
            placeholder: "BTC",
            tooltip: "HyperLiquid coin symbol (e.g. BTC, ETH, SOL).",
        }),
    ],
    outputs: [
        OutputBuilder.DataList({
            id: "candles",
            displayName: "Candles",
            tooltip: "Array of OHLCV candles: { t, T, s, i, o, c, h, l, v, n }.",
        }),
        OutputBuilder.Json({
            id: "summary",
            displayName: "Summary",
            tooltip: "Convenience summary: { coin, interval, count, firstClose, lastClose, change, changePct }.",
        }),
    ],
});


export const ToolBlueprint = defineBlueprint({
    id: "Integrations.HyperLiquid.Market",
    displayName: "HyperLiquid Market",
    description: "Exposes HyperLiquid market-data tools to an agent.",
    icon: "HyperLiquid",
    proxyCompatible: true,
    accent: "port-ToolList",
    iconColor: "color-cyan-500",
    toolCompatible: true,
    fields: [
        FieldBuilder.MultiOption({
            id: "interval",
            displayName: "Default Interval",
            options: intervalOptions,
            initialValue: "1h",
            tooltip: "Default candle interval used by the getCandles tool when the agent doesn't specify one.",
        }),
        FieldBuilder.Integer({
            id: "lookbackHours",
            displayName: "Default Lookback (hours)",
            initialValue: 24,
            min: 1,
            max: 24 * 365,
            tooltip: "Default lookback used by the getCandles tool when the agent doesn't specify one.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.ToolList({
            id: "tools",
            displayName: "HyperLiquid Tools",
            tooltip: "Toolkit: hyperliquid_get_candles, hyperliquid_get_mids, hyperliquid_get_order_book, hyperliquid_get_meta.",
        }),
    ],
});
