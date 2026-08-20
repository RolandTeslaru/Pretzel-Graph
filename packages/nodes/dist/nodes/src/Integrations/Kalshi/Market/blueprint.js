"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const marketStatusOptions = [
    { value: "unopened", displayName: "Unopened" },
    { value: "open", displayName: "Open" },
    { value: "paused", displayName: "Paused" },
    { value: "closed", displayName: "Closed" },
    { value: "settled", displayName: "Settled" },
];
const eventStatusOptions = [
    { value: "unopened", displayName: "Unopened" },
    { value: "open", displayName: "Open" },
    { value: "closed", displayName: "Closed" },
    { value: "settled", displayName: "Settled" },
    { value: "all", displayName: "All" },
];
const windowOptions = [
    { value: "1d", displayName: "1 day" },
    { value: "7d", displayName: "7 days" },
    { value: "30d", displayName: "30 days" },
    { value: "90d", displayName: "90 days" },
    { value: "1y", displayName: "1 year" },
    { value: "max", displayName: "Max" },
];
const intervalOptions = [
    { value: "1", displayName: "1 minute" },
    { value: "60", displayName: "1 hour" },
    { value: "1440", displayName: "1 day" },
];
/**
 * Kalshi has no public full-text search endpoint. The node exposes the two real user intents:
 * browse a collection, or fetch one chosen resource. Generated-client/API organization stays out
 * of the graph; KalshiPublicSDK owns it.
 */
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Kalshi.Market",
    displayName: "Kalshi Market",
    description: "Reads Kalshi series, events, markets, exchange prices, trades and status.",
    icon: "Kalshi",
    accent: "port-DataList",
    proxyCompatible: true,
    toolCompatible: true,
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("action", "Action", {
            options: [
                { value: "list", displayName: "List", description: "Browse markets, events, series or public trades." },
                { value: "get", displayName: "Get", description: "Fetch one resource or exchange reading." },
            ],
            initialValue: "list",
            variant: "tab",
        }),
    ],
    inputs: [],
    outputs: [],
    "action==list": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("listResource", "Resource", {
                options: [
                    { value: "markets", displayName: "Markets" },
                    { value: "events", displayName: "Events" },
                    { value: "series", displayName: "Series" },
                    { value: "trades", displayName: "Trades", description: "Public fills, optionally including the historical partition." },
                ],
                initialValue: "markets",
            }),
        ],
        "listResource==markets": {
            fields: [
                node_sdk_1.FieldBuilder.MultiOption("listMarketsStatus", "Status", {
                    options: marketStatusOptions,
                    initialValue: "open",
                }),
                node_sdk_1.FieldBuilder.String("listMarketsEventTicker", "Event Ticker", {
                    placeholder: "KXPRES-28",
                    tooltip: "Optional. Limit results to one event.",
                }),
                node_sdk_1.FieldBuilder.String("listMarketsSeriesTicker", "Series Ticker", {
                    placeholder: "KXPRES",
                    tooltip: "Optional. Limit results to one recurring series.",
                }),
                node_sdk_1.FieldBuilder.Integer("listMarketsMaxResults", "Max Results", {
                    initialValue: 20,
                    min: 1,
                    max: 1_000,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("markets", "Markets")],
        },
        "listResource==events": {
            fields: [
                node_sdk_1.FieldBuilder.MultiOption("listEventsStatus", "Status", {
                    options: eventStatusOptions,
                    initialValue: "open",
                }),
                node_sdk_1.FieldBuilder.String("listEventsSeriesTicker", "Series Ticker", {
                    placeholder: "KXPRES",
                }),
                node_sdk_1.FieldBuilder.Boolean("listEventsIncludeMarkets", "Include Markets", {
                    initialValue: false,
                    tooltip: "Embeds compact markets in each event. Leave off when browsing.",
                }),
                node_sdk_1.FieldBuilder.Integer("listEventsMaxResults", "Max Results", {
                    initialValue: 20,
                    min: 1,
                    max: 1_000,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("events", "Events")],
        },
        "listResource==series": {
            fields: [
                node_sdk_1.FieldBuilder.String("listSeriesCategory", "Category", {
                    placeholder: "Politics",
                }),
                node_sdk_1.FieldBuilder.String("listSeriesTags", "Tags", {
                    tooltip: "Optional comma-separated tags.",
                }),
                node_sdk_1.FieldBuilder.Boolean("listSeriesIncludeVolume", "Include Volume", {
                    initialValue: true,
                }),
                node_sdk_1.FieldBuilder.Integer("listSeriesMaxResults", "Max Results", {
                    initialValue: 20,
                    min: 1,
                    max: 1_000,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("series", "Series")],
        },
        "listResource==trades": {
            fields: [
                node_sdk_1.FieldBuilder.String("listTradesTicker", "Market Ticker", {
                    placeholder: "KXPRES-28-CANDIDATE",
                    tooltip: "Optional. Leave empty for trades across markets.",
                }),
                node_sdk_1.FieldBuilder.Boolean("listTradesIncludeHistorical", "Include Historical", {
                    initialValue: false,
                    tooltip: "Also reads Kalshi's archived trade partition.",
                }),
                node_sdk_1.FieldBuilder.Boolean("listTradesBlockOnly", "Block Trades Only", {
                    initialValue: false,
                }),
                node_sdk_1.FieldBuilder.Integer("listTradesMaxResults", "Max Results", {
                    initialValue: 100,
                    min: 1,
                    max: 1_000,
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("trades", "Trades")],
        },
    },
    "action==get": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("getResource", "Resource", {
                options: [
                    { value: "market", displayName: "Market" },
                    { value: "event", displayName: "Event" },
                    { value: "series", displayName: "Series" },
                    { value: "orderBook", displayName: "Order Book" },
                    { value: "priceHistory", displayName: "Price History" },
                    { value: "exchangeStatus", displayName: "Exchange Status" },
                ],
                initialValue: "market",
            }),
        ],
        "getResource==market": {
            fields: [
                node_sdk_1.FieldBuilder.String("getMarketTicker", "Market Ticker", {
                    required: true,
                    placeholder: "KXPRES-28-CANDIDATE",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("market", "Market")],
        },
        "getResource==event": {
            fields: [
                node_sdk_1.FieldBuilder.String("getEventTicker", "Event Ticker", {
                    required: true,
                    placeholder: "KXPRES-28",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("event", "Event")],
        },
        "getResource==series": {
            fields: [
                node_sdk_1.FieldBuilder.String("getSeriesTicker", "Series Ticker", {
                    required: true,
                    placeholder: "KXPRES",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("series", "Series")],
        },
        "getResource==orderBook": {
            fields: [
                node_sdk_1.FieldBuilder.String("getOrderBookTicker", "Market Ticker", {
                    required: true,
                }),
                node_sdk_1.FieldBuilder.Integer("getOrderBookDepth", "Depth", {
                    initialValue: 15,
                    min: 1,
                    max: 100,
                    tooltip: "Price levels per outcome, best first.",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("orderBook", "Order Book")],
        },
        "getResource==priceHistory": {
            fields: [
                node_sdk_1.FieldBuilder.String("getPriceHistoryTicker", "Market Ticker", {
                    required: true,
                }),
                node_sdk_1.FieldBuilder.MultiOption("getPriceHistoryWindow", "Window", {
                    options: windowOptions,
                    initialValue: "30d",
                }),
                node_sdk_1.FieldBuilder.MultiOption("getPriceHistoryInterval", "Candlestick", {
                    options: intervalOptions,
                    initialValue: "60",
                }),
                node_sdk_1.FieldBuilder.Integer("getPriceHistoryPoints", "Points to Return", {
                    initialValue: 120,
                    min: 2,
                    max: 500,
                    tooltip: "Longer responses are evenly sampled while preserving the newest point.",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("history", "Price History")],
        },
        "getResource==exchangeStatus": {
            outputs: [node_sdk_1.OutputBuilder.Data("status", "Exchange Status")],
        },
    },
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: [],
        inputs: [],
        outputs: [node_sdk_1.OutputBuilder.ToolList("tools", "Kalshi Tools")],
    }),
});
