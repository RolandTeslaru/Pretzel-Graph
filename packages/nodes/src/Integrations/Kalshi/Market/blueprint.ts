import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk"


const marketStatusOptions = [
    { value: "unopened", displayName: "Unopened" },
    { value: "open",     displayName: "Open"     },
    { value: "paused",   displayName: "Paused"   },
    { value: "closed",   displayName: "Closed"   },
    { value: "settled",  displayName: "Settled"  },
] as const

const eventStatusOptions = [
    { value: "unopened", displayName: "Unopened" },
    { value: "open",     displayName: "Open"     },
    { value: "closed",   displayName: "Closed"   },
    { value: "settled",  displayName: "Settled"  },
    { value: "all",      displayName: "All"      },
] as const

const windowOptions = [
    { value: "1d",  displayName: "1 day"   },
    { value: "7d",  displayName: "7 days"  },
    { value: "30d", displayName: "30 days" },
    { value: "90d", displayName: "90 days" },
    { value: "1y",  displayName: "1 year"  },
    { value: "max", displayName: "Max"     },
] as const

const intervalOptions = [
    { value: "1",    displayName: "1 minute" },
    { value: "60",   displayName: "1 hour"   },
    { value: "1440", displayName: "1 day"    },
] as const


/**
 * Kalshi has no public full-text search endpoint. The node exposes the two real user intents:
 * browse a collection, or fetch one chosen resource. Generated-client/API organization stays out
 * of the graph; KalshiPublicSDK owns it.
 */
export const Blueprint = defineBlueprint({
    id:              "Integrations.Kalshi.Market",
    displayName:     "Kalshi Market",
    description:     "Reads Kalshi series, events, markets, exchange prices, trades and status.",
    icon:            "Kalshi",
    accent:          "port-DataList",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        FieldBuilder.MultiOption("action", "Action", {
            options: [
                { value: "list", displayName: "List", description: "Browse markets, events, series or public trades." },
                { value: "get",  displayName: "Get",  description: "Fetch one resource or exchange reading." },
            ],
            initialValue: "list",
            variant:      "tab",
        }),
    ],
    inputs:  [],
    outputs: [],


    "action==list": {
        fields: [
            FieldBuilder.MultiOption("listResource", "Resource", {
                options: [
                    { value: "markets", displayName: "Markets" },
                    { value: "events",  displayName: "Events"  },
                    { value: "series",  displayName: "Series"  },
                    { value: "trades",  displayName: "Trades", description: "Public fills, optionally including the historical partition." },
                ],
                initialValue: "markets",
            }),
        ],

        "listResource==markets": {
            fields: [
                FieldBuilder.MultiOption("listMarketsStatus", "Status", {
                    options:      marketStatusOptions,
                    initialValue: "open",
                }),
                FieldBuilder.String("listMarketsEventTicker", "Event Ticker", {
                    placeholder: "KXPRES-28",
                    tooltip:     "Optional. Limit results to one event.",
                }),
                FieldBuilder.String("listMarketsSeriesTicker", "Series Ticker", {
                    placeholder: "KXPRES",
                    tooltip:     "Optional. Limit results to one recurring series.",
                }),
                FieldBuilder.Integer("listMarketsMaxResults", "Max Results", {
                    initialValue: 20,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [OutputBuilder.DataList("markets", "Markets")],
        },

        "listResource==events": {
            fields: [
                FieldBuilder.MultiOption("listEventsStatus", "Status", {
                    options:      eventStatusOptions,
                    initialValue: "open",
                }),
                FieldBuilder.String("listEventsSeriesTicker", "Series Ticker", {
                    placeholder: "KXPRES",
                }),
                FieldBuilder.Boolean("listEventsIncludeMarkets", "Include Markets", {
                    initialValue: false,
                    tooltip:     "Embeds compact markets in each event. Leave off when browsing.",
                }),
                FieldBuilder.Integer("listEventsMaxResults", "Max Results", {
                    initialValue: 20,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [OutputBuilder.DataList("events", "Events")],
        },

        "listResource==series": {
            fields: [
                FieldBuilder.String("listSeriesCategory", "Category", {
                    placeholder: "Politics",
                }),
                FieldBuilder.String("listSeriesTags", "Tags", {
                    tooltip: "Optional comma-separated tags.",
                }),
                FieldBuilder.Boolean("listSeriesIncludeVolume", "Include Volume", {
                    initialValue: true,
                }),
                FieldBuilder.Integer("listSeriesMaxResults", "Max Results", {
                    initialValue: 20,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [OutputBuilder.DataList("series", "Series")],
        },

        "listResource==trades": {
            fields: [
                FieldBuilder.String("listTradesTicker", "Market Ticker", {
                    placeholder: "KXPRES-28-CANDIDATE",
                    tooltip:     "Optional. Leave empty for trades across markets.",
                }),
                FieldBuilder.Boolean("listTradesIncludeHistorical", "Include Historical", {
                    initialValue: false,
                    tooltip:     "Also reads Kalshi's archived trade partition.",
                }),
                FieldBuilder.Boolean("listTradesBlockOnly", "Block Trades Only", {
                    initialValue: false,
                }),
                FieldBuilder.Integer("listTradesMaxResults", "Max Results", {
                    initialValue: 100,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [OutputBuilder.DataList("trades", "Trades")],
        },
    },


    "action==get": {
        fields: [
            FieldBuilder.MultiOption("getResource", "Resource", {
                options: [
                    { value: "market",         displayName: "Market"         },
                    { value: "event",          displayName: "Event"          },
                    { value: "series",         displayName: "Series"         },
                    { value: "orderBook",      displayName: "Order Book"     },
                    { value: "priceHistory",   displayName: "Price History"  },
                    { value: "exchangeStatus", displayName: "Exchange Status" },
                ],
                initialValue: "market",
            }),
        ],

        "getResource==market": {
            fields: [
                FieldBuilder.String("getMarketTicker", "Market Ticker", {
                    required:    true,
                    placeholder: "KXPRES-28-CANDIDATE",
                }),
            ],
            outputs: [OutputBuilder.Data("market", "Market")],
        },

        "getResource==event": {
            fields: [
                FieldBuilder.String("getEventTicker", "Event Ticker", {
                    required:    true,
                    placeholder: "KXPRES-28",
                }),
            ],
            outputs: [OutputBuilder.Data("event", "Event")],
        },

        "getResource==series": {
            fields: [
                FieldBuilder.String("getSeriesTicker", "Series Ticker", {
                    required:    true,
                    placeholder: "KXPRES",
                }),
            ],
            outputs: [OutputBuilder.Data("series", "Series")],
        },

        "getResource==orderBook": {
            fields: [
                FieldBuilder.String("getOrderBookTicker", "Market Ticker", {
                    required: true,
                }),
                FieldBuilder.Integer("getOrderBookDepth", "Depth", {
                    initialValue: 15,
                    min:          1,
                    max:          100,
                    tooltip:      "Price levels per outcome, best first.",
                }),
            ],
            outputs: [OutputBuilder.Data("orderBook", "Order Book")],
        },

        "getResource==priceHistory": {
            fields: [
                FieldBuilder.String("getPriceHistoryTicker", "Market Ticker", {
                    required: true,
                }),
                FieldBuilder.MultiOption("getPriceHistoryWindow", "Window", {
                    options:      windowOptions,
                    initialValue: "30d",
                }),
                FieldBuilder.MultiOption("getPriceHistoryInterval", "Candlestick", {
                    options:      intervalOptions,
                    initialValue: "60",
                }),
                FieldBuilder.Integer("getPriceHistoryPoints", "Points to Return", {
                    initialValue: 120,
                    min:          2,
                    max:          500,
                    tooltip:      "Longer responses are evenly sampled while preserving the newest point.",
                }),
            ],
            outputs: [OutputBuilder.Data("history", "Price History")],
        },

        "getResource==exchangeStatus": {
            outputs: [OutputBuilder.Data("status", "Exchange Status")],
        },
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Kalshi Tools")],
    }),
})
