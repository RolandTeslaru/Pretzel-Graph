import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
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
        defineField.MultiOption("action", "Action", {
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
            defineField.MultiOption("listResource", "Resource", {
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
                defineField.MultiOption("listMarketsStatus", "Status", {
                    options:      marketStatusOptions,
                    initialValue: "open",
                }),
                defineField.String("listMarketsEventTicker", "Event Ticker", {
                    placeholder: "KXPRES-28",
                    tooltip:     "Optional. Limit results to one event.",
                }),
                defineField.String("listMarketsSeriesTicker", "Series Ticker", {
                    placeholder: "KXPRES",
                    tooltip:     "Optional. Limit results to one recurring series.",
                }),
                defineField.Integer("listMarketsMaxResults", "Max Results", {
                    initialValue: 20,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [defineOutput.DataList("markets", "Markets")],
        },

        "listResource==events": {
            fields: [
                defineField.MultiOption("listEventsStatus", "Status", {
                    options:      eventStatusOptions,
                    initialValue: "open",
                }),
                defineField.String("listEventsSeriesTicker", "Series Ticker", {
                    placeholder: "KXPRES",
                }),
                defineField.Boolean("listEventsIncludeMarkets", "Include Markets", {
                    initialValue: false,
                    tooltip:     "Embeds compact markets in each event. Leave off when browsing.",
                }),
                defineField.Integer("listEventsMaxResults", "Max Results", {
                    initialValue: 20,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [defineOutput.DataList("events", "Events")],
        },

        "listResource==series": {
            fields: [
                defineField.String("listSeriesCategory", "Category", {
                    placeholder: "Politics",
                }),
                defineField.String("listSeriesTags", "Tags", {
                    tooltip: "Optional comma-separated tags.",
                }),
                defineField.Boolean("listSeriesIncludeVolume", "Include Volume", {
                    initialValue: true,
                }),
                defineField.Integer("listSeriesMaxResults", "Max Results", {
                    initialValue: 20,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [defineOutput.DataList("series", "Series")],
        },

        "listResource==trades": {
            fields: [
                defineField.String("listTradesTicker", "Market Ticker", {
                    placeholder: "KXPRES-28-CANDIDATE",
                    tooltip:     "Optional. Leave empty for trades across markets.",
                }),
                defineField.Boolean("listTradesIncludeHistorical", "Include Historical", {
                    initialValue: false,
                    tooltip:     "Also reads Kalshi's archived trade partition.",
                }),
                defineField.Boolean("listTradesBlockOnly", "Block Trades Only", {
                    initialValue: false,
                }),
                defineField.Integer("listTradesMaxResults", "Max Results", {
                    initialValue: 100,
                    min:          1,
                    max:          1_000,
                }),
            ],
            outputs: [defineOutput.DataList("trades", "Trades")],
        },
    },


    "action==get": {
        fields: [
            defineField.MultiOption("getResource", "Resource", {
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
                defineField.String("getMarketTicker", "Market Ticker", {
                    required:    true,
                    placeholder: "KXPRES-28-CANDIDATE",
                }),
            ],
            outputs: [defineOutput.Data("market", "Market")],
        },

        "getResource==event": {
            fields: [
                defineField.String("getEventTicker", "Event Ticker", {
                    required:    true,
                    placeholder: "KXPRES-28",
                }),
            ],
            outputs: [defineOutput.Data("event", "Event")],
        },

        "getResource==series": {
            fields: [
                defineField.String("getSeriesTicker", "Series Ticker", {
                    required:    true,
                    placeholder: "KXPRES",
                }),
            ],
            outputs: [defineOutput.Data("series", "Series")],
        },

        "getResource==orderBook": {
            fields: [
                defineField.String("getOrderBookTicker", "Market Ticker", {
                    required: true,
                }),
                defineField.Integer("getOrderBookDepth", "Depth", {
                    initialValue: 15,
                    min:          1,
                    max:          100,
                    tooltip:      "Price levels per outcome, best first.",
                }),
            ],
            outputs: [defineOutput.Data("orderBook", "Order Book")],
        },

        "getResource==priceHistory": {
            fields: [
                defineField.String("getPriceHistoryTicker", "Market Ticker", {
                    required: true,
                }),
                defineField.MultiOption("getPriceHistoryWindow", "Window", {
                    options:      windowOptions,
                    initialValue: "30d",
                }),
                defineField.MultiOption("getPriceHistoryInterval", "Candlestick", {
                    options:      intervalOptions,
                    initialValue: "60",
                }),
                defineField.Integer("getPriceHistoryPoints", "Points to Return", {
                    initialValue: 120,
                    min:          2,
                    max:          500,
                    tooltip:      "Longer responses are evenly sampled while preserving the newest point.",
                }),
            ],
            outputs: [defineOutput.Data("history", "Price History")],
        },

        "getResource==exchangeStatus": {
            outputs: [defineOutput.Data("status", "Exchange Status")],
        },
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Kalshi Tools")],
    }),
})
