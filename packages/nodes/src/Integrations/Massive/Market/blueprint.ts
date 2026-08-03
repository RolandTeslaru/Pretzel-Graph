import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk";
import { Massive } from "@pretzel-graph/nodes/Credentials/Massive";

const timespanOptions = [
    { value: "minute", displayName: "Minute" },
    { value: "hour",   displayName: "Hour" },
    { value: "day",    displayName: "Day" },
] as const;

const candleFields = () => [
    FieldBuilder.MultiOption("timespan", "Timespan", {
        options:      timespanOptions,
        initialValue: "minute",
        tooltip:     "Candle granularity.",
    }),
    FieldBuilder.Integer("multiplier", "Multiplier", {
        initialValue: 1,
        min:          1,
        max:          60,
        tooltip:     "Candle multiplier (e.g. 5 + minute = 5-minute candles).",
    }),
    FieldBuilder.Integer("lookbackHours", "Lookback (hours)", {
        initialValue: 24,
        min:          1,
        max:          24 * 365,
        tooltip:     "How far back to fetch candles, in hours. The end time is always 'now'.",
    }),
    FieldBuilder.Boolean("adjusted", "Adjusted", {
        initialValue: true,
        advanced:     true,
        tooltip:      "Whether to request adjusted data for aggregates when supported by the API.",
    }),
] as const;

export const Blueprint = defineBlueprint({
    id:              "Integrations.Massive.Market",
    credentials:     [Massive],
    displayName:     "Massive Market",
    description:     "Reads US stock market data from Massive (formerly Polygon.io): candle history, snapshots, company details, financials, and market status.",
    icon:            "Massive",
    proxyCompatible: true,
    accent:          "port-DataList",
    toolCompatible:  true,
    fields: [
        FieldBuilder.String("ticker", "Ticker", {
            required:    true,
            placeholder: "AAPL",
            tooltip:     "US stock ticker symbol (e.g. AAPL, MSFT, TSLA). Unused by the Market Status action.",
        }),
        FieldBuilder.MultiOption("action", "Action", {
            options: [
                { value: "candles",      displayName: "Candles — OHLCV history" },
                { value: "snapshot",     displayName: "Snapshot — live price & day metrics" },
                { value: "details",      displayName: "Details — company reference data" },
                { value: "financials",   displayName: "Financials — revenue, earnings, balance sheet" },
                { value: "marketStatus", displayName: "Market Status — open / closed" },
            ],
            initialValue: "candles",
            tooltip:     "What to fetch for the ticker.",
        }),
    ],
    inputs:  [],
    outputs: [],

    "action==candles": {
        fields: candleFields(),
        outputs: [
            OutputBuilder.DataList("candles", "Candles", {
                tooltip: "Array of OHLCV aggregates (bars) returned by Massive.",
            }),
            OutputBuilder.Data("summary", "Summary", {
                tooltip: "Convenience summary: { ticker, timespan, multiplier, count, firstClose, lastClose, change, changePct }.",
            }),
        ],
    },

    "action==snapshot": {
        outputs: [
            OutputBuilder.Data("data", "Snapshot", {
                tooltip: "Live state: today's OHLC and volume, change, the previous day's bar, last trade and last quote.",
            }),
        ],
    },

    "action==details": {
        outputs: [
            OutputBuilder.Data("data", "Details", {
                tooltip: "Company reference data: name, description, market cap, shares outstanding, exchange, branding.",
            }),
        ],
    },

    "action==financials": {
        fields: [
            FieldBuilder.MultiOption("timeframe", "Timeframe", {
                options: [
                    { value: "annual",    displayName: "Annual" },
                    { value: "quarterly", displayName: "Quarterly" },
                ],
                initialValue: "quarterly",
                tooltip:     "Reporting period for the financial statements.",
            }),
            FieldBuilder.Integer("limit", "Limit", {
                initialValue: 4,
                min:          1,
                max:          100,
                tooltip:     "How many reporting periods to return.",
            }),
        ],
        outputs: [
            OutputBuilder.DataList("data", "Financials", {
                tooltip: "One item per reporting period: income statement, balance sheet and cash flow.",
            }),
        ],
    },

    "action==marketStatus": {
        outputs: [
            OutputBuilder.Data("data", "Market Status", {
                tooltip: "Whether US markets are currently open, plus after-hours and per-exchange status.",
            }),
        ],
    },

    "isConvertedToTool==true": defineTool({
        fields: [
            FieldBuilder.MultiOption("timespan", "Default Timespan", {
                options:      timespanOptions,
                initialValue: "minute",
                tooltip:     "Default timespan used by getCandles when the agent doesn't specify one.",
            }),
            FieldBuilder.Integer("multiplier", "Default Multiplier", {
                initialValue: 1,
                min:          1,
                max:          60,
                tooltip:     "Default multiplier used by getCandles when the agent doesn't specify one.",
            }),
            FieldBuilder.Integer("lookbackHours", "Default Lookback (hours)", {
                initialValue: 24,
                min:          1,
                max:          24 * 365,
                tooltip:     "Default lookback used by getCandles when the agent doesn't specify one.",
            }),
            FieldBuilder.Boolean("adjusted", "Adjusted", {
                initialValue: true,
                tooltip:      "Whether to request adjusted data for aggregates when supported by the API.",
                advanced:     true,
            }),
        ],
        inputs:  [],
        outputs: [
            OutputBuilder.ToolList("tools", "Massive Tools", {
                tooltip: "Toolkit: massive_get_candles, massive_get_news, massive_get_snapshot, massive_get_last_trade, massive_get_last_quote, massive_get_ticker_details, massive_search_tickers, massive_get_financials, massive_get_market_status.",
            }),
        ],
    }),
});
