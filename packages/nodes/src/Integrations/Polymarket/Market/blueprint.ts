import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk";


const statusOptions = [
    { value: "active", displayName: "Active" },
    { value: "closed", displayName: "Closed" },
    { value: "all",    displayName: "All"    },
] as const;

const lookupOptions = [
    { value: "id",   displayName: "ID"   },
    { value: "slug", displayName: "Slug" },
] as const;

const sideOptions = [
    { value: "BUY",  displayName: "Buy"  },
    { value: "SELL", displayName: "Sell" },
] as const;

const tradeSideOptions = [
    { value: "all",  displayName: "All"  },
    { value: "BUY",  displayName: "Buy"  },
    { value: "SELL", displayName: "Sell" },
] as const;


export const Blueprint = defineBlueprint({
    id:              "Integrations.Polymarket.Market",
    displayName:     "Polymarket Market",
    description:     "Searches Polymarket and reads public market metadata, exchange state, and analytics.",
    icon:            "Polymarket",
    accent:          "port-DataList",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        FieldBuilder.MultiOption("action", "Action", {
            options: [
                { value: "search", displayName: "Search", description: "Search markets or Polymarket's public discovery index." },
                { value: "list",   displayName: "List",   description: "List metadata, exchange records, or market analytics." },
                { value: "get",    displayName: "Get",    description: "Fetch one resource, market-data view, or analytic." },
            ],
            initialValue: "search",
        }),
    ],
    inputs:  [],
    outputs: [],


    "action==search": {
        fields: [
            FieldBuilder.MultiOption("searchKind", "Search", {
                options: [
                    { value: "markets", displayName: "Markets",          description: "Search market questions and slugs." },
                    { value: "public",  displayName: "Public Discovery", description: "Search events, markets, tags, and public profiles." },
                ],
                initialValue: "markets",
                variant:      "tab",
            }),
        ],

        "searchKind==markets": {
            fields: [
                FieldBuilder.String("searchMarketsQuery", "Query", { placeholder: "election" }),
                FieldBuilder.MultiOption("searchMarketsStatus", "Status", {
                    options:      statusOptions,
                    initialValue: "active",
                    variant:      "tab",
                }),
                FieldBuilder.Integer("searchMarketsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [OutputBuilder.DataList("markets", "Markets")],
        },

        "searchKind==public": {
            fields: [
                FieldBuilder.String("publicSearchQuery", "Query", { required: true, placeholder: "election" }),
                FieldBuilder.Boolean("publicSearchSearchTags", "Include Tags", { initialValue: false }),
                FieldBuilder.Boolean("publicSearchSearchProfiles", "Include Profiles", { initialValue: false }),
                FieldBuilder.Integer("publicSearchMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [OutputBuilder.Data("results", "Results")],
        },
    },


    "action==list": {
        fields: [
            FieldBuilder.MultiOption("listAPI", "API", {
                options: [
                    { value: "gamma", displayName: "Gamma", description: "Metadata, discovery, discussion, and sports." },
                    { value: "data",  displayName: "Data",  description: "Public trades and market-holder analytics." },
                ],
                initialValue: "gamma",
                variant:      "tab",
            }),
        ],

        "listAPI==gamma": {
            fields: [
                FieldBuilder.MultiOption("listGammaResource", "Resource", {
                    options: [
                        { value: "markets",  displayName: "Markets"  },
                        { value: "events",   displayName: "Events"   },
                        { value: "tags",     displayName: "Tags"     },
                        { value: "series",   displayName: "Series"   },
                        { value: "comments", displayName: "Comments" },
                        { value: "sports",   displayName: "Sports"   },
                        { value: "teams",    displayName: "Teams"    },
                    ],
                    initialValue: "markets",
                }),
            ],

            "listGammaResource==markets": {
                fields: [
                    FieldBuilder.MultiOption("listMarketsStatus", "Status", {
                        options:      statusOptions,
                        initialValue: "active",
                        variant:      "tab",
                    }),
                    FieldBuilder.Integer("listMarketsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
                ],
                outputs: [OutputBuilder.DataList("markets", "Markets")],
            },

            "listGammaResource==events": {
                fields: [
                    FieldBuilder.MultiOption("listEventsStatus", "Status", {
                        options:      statusOptions,
                        initialValue: "active",
                        variant:      "tab",
                    }),
                    FieldBuilder.Integer("listEventsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
                ],
                outputs: [OutputBuilder.DataList("events", "Events")],
            },

            "listGammaResource==tags": {
                fields: [
                    FieldBuilder.Integer("listTagsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
                ],
                outputs: [OutputBuilder.DataList("tags", "Tags")],
            },

            "listGammaResource==series": {
                fields: [
                    FieldBuilder.String("listSeriesSlug", "Slug"),
                    FieldBuilder.Integer("listSeriesMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
                ],
                outputs: [OutputBuilder.DataList("series", "Series")],
            },

            "listGammaResource==comments": {
                fields: [
                    FieldBuilder.MultiOption("listCommentsParentEntityType", "Parent Type", {
                        options: [
                            { value: "Event",  displayName: "Event"  },
                            { value: "Series", displayName: "Series" },
                            { value: "market", displayName: "Market" },
                        ],
                        initialValue: "Event",
                        variant:      "tab",
                    }),
                    FieldBuilder.String("listCommentsParentId", "Parent ID", { required: true }),
                    FieldBuilder.Boolean("listCommentsGetPositions", "Include Positions", { initialValue: false }),
                    FieldBuilder.Boolean("listCommentsHoldersOnly", "Holders Only", { initialValue: false }),
                    FieldBuilder.Integer("listCommentsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
                ],
                outputs: [OutputBuilder.DataList("comments", "Comments")],
            },

            "listGammaResource==sports": {
                outputs: [OutputBuilder.DataList("sports", "Sports")],
            },

            "listGammaResource==teams": {
                fields: [
                    FieldBuilder.String("listTeamsName", "Team Name"),
                    FieldBuilder.Integer("listTeamsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
                ],
                outputs: [OutputBuilder.DataList("teams", "Teams")],
            },
        },

        "listAPI==data": {
            fields: [
                FieldBuilder.MultiOption("listDataResource", "Resource", {
                    options: [
                        { value: "trades",  displayName: "Trades"  },
                        { value: "holders", displayName: "Holders" },
                    ],
                    initialValue: "trades",
                }),
            ],

            "listDataResource==trades": {
                fields: [
                    FieldBuilder.String("listTradesConditionId", "Condition ID", {
                        required:    true,
                        placeholder: "0x…",
                    }),
                    FieldBuilder.MultiOption("listTradesSide", "Side", {
                        options:      tradeSideOptions,
                        initialValue: "all",
                        variant:      "tab",
                    }),
                    FieldBuilder.Integer("listTradesMaxResults", "Max Results", { initialValue: 100, min: 1, max: 10_000 }),
                ],
                outputs: [OutputBuilder.DataList("trades", "Trades")],
            },

            "listDataResource==holders": {
                fields: [
                    FieldBuilder.String("listHoldersConditionId", "Condition ID", {
                        required:    true,
                        placeholder: "0x…",
                    }),
                    FieldBuilder.Integer("listHoldersMaxResults", "Max Results", { initialValue: 20, min: 1, max: 20 }),
                ],
                outputs: [OutputBuilder.DataList("holders", "Holders")],
            },
        },
    },


    "action==get": {
        fields: [
            FieldBuilder.MultiOption("getAPI", "API", {
                options: [
                    { value: "gamma", displayName: "Gamma", description: "Markets, events, tags, and series metadata." },
                    { value: "clob",  displayName: "CLOB",  description: "Exchange configuration, prices, books, mechanics, and rewards." },
                    { value: "data",  displayName: "Data",  description: "Open interest and live volume analytics." },
                ],
                initialValue: "gamma",
                variant:      "tab",
            }),
        ],

        "getAPI==gamma": {
            fields: [
                FieldBuilder.MultiOption("getGammaResource", "Resource", {
                    options: [
                        { value: "market", displayName: "Market" },
                        { value: "event",  displayName: "Event"  },
                        { value: "tag",    displayName: "Tag"    },
                        { value: "series", displayName: "Series" },
                    ],
                    initialValue: "market",
                }),
            ],

            "getGammaResource==market": {
                fields: [
                    FieldBuilder.MultiOption("getMarketLookupBy", "Look Up By", {
                        options:      lookupOptions,
                        initialValue: "id",
                        variant:      "tab",
                    }),
                    FieldBuilder.String("getMarketIdentifier", "Market Identifier", { required: true }),
                ],
                outputs: [OutputBuilder.Data("market", "Market")],
            },

            "getGammaResource==event": {
                fields: [
                    FieldBuilder.MultiOption("getEventLookupBy", "Look Up By", {
                        options:      lookupOptions,
                        initialValue: "id",
                        variant:      "tab",
                    }),
                    FieldBuilder.String("getEventIdentifier", "Event Identifier", { required: true }),
                ],
                outputs: [OutputBuilder.Data("event", "Event")],
            },

            "getGammaResource==tag": {
                fields: [
                    FieldBuilder.MultiOption("getTagLookupBy", "Look Up By", {
                        options:      lookupOptions,
                        initialValue: "id",
                        variant:      "tab",
                    }),
                    FieldBuilder.String("getTagIdentifier", "Tag Identifier", { required: true }),
                ],
                outputs: [OutputBuilder.Data("tag", "Tag")],
            },

            "getGammaResource==series": {
                fields: [
                    FieldBuilder.String("getSeriesIdentifier", "Series ID", { required: true }),
                ],
                outputs: [OutputBuilder.Data("series", "Series")],
            },
        },

        "getAPI==clob": {
            fields: [
                FieldBuilder.MultiOption("getClobResource", "Resource", {
                    options: [
                        { value: "marketConfiguration", displayName: "Market Configuration" },
                        { value: "orderBook",           displayName: "Order Book"           },
                        { value: "midpoint",            displayName: "Midpoint"             },
                        { value: "price",               displayName: "Price"                },
                        { value: "spread",              displayName: "Spread"               },
                        { value: "lastTradePrice",      displayName: "Last Trade Price"     },
                        { value: "priceHistory",        displayName: "Price History"        },
                        { value: "mechanics",           displayName: "Market Mechanics"     },
                        { value: "rewards",             displayName: "Market Rewards"       },
                    ],
                    initialValue: "marketConfiguration",
                }),
            ],

            "getClobResource==marketConfiguration": {
                fields: [
                    FieldBuilder.String("getClobMarketConditionId", "Condition ID", {
                        required:    true,
                        placeholder: "0x…",
                    }),
                ],
                outputs: [OutputBuilder.Data("market", "Market")],
            },

            "getClobResource==orderBook": {
                fields: [
                    FieldBuilder.String("getOrderBookTokenId", "Token ID", { required: true }),
                ],
                outputs: [OutputBuilder.Data("orderBook", "Order Book")],
            },

            "getClobResource==midpoint": {
                fields: [
                    FieldBuilder.String("getMidpointTokenId", "Token ID", { required: true }),
                ],
                outputs: [OutputBuilder.Data("midpoint", "Midpoint")],
            },

            "getClobResource==price": {
                fields: [
                    FieldBuilder.String("getPriceTokenId", "Token ID", { required: true }),
                    FieldBuilder.MultiOption("getPriceSide", "Side", {
                        options:      sideOptions,
                        initialValue: "BUY",
                        variant:      "tab",
                    }),
                ],
                outputs: [OutputBuilder.Data("price", "Price")],
            },

            "getClobResource==spread": {
                fields: [
                    FieldBuilder.String("getSpreadTokenId", "Token ID", { required: true }),
                ],
                outputs: [OutputBuilder.Data("spread", "Spread")],
            },

            "getClobResource==lastTradePrice": {
                fields: [
                    FieldBuilder.String("getLastTradePriceTokenId", "Token ID", { required: true }),
                ],
                outputs: [OutputBuilder.Data("lastTrade", "Last Trade")],
            },

            "getClobResource==priceHistory": {
                fields: [
                    FieldBuilder.String("getPriceHistoryTokenId", "Token ID", { required: true }),
                    FieldBuilder.MultiOption("getPriceHistoryInterval", "Interval", {
                        options: [
                            { value: "1h",  displayName: "1 hour"  },
                            { value: "6h",  displayName: "6 hours" },
                            { value: "1d",  displayName: "1 day"   },
                            { value: "1w",  displayName: "1 week"  },
                            { value: "max", displayName: "Max"     },
                        ],
                        initialValue: "1d",
                    }),
                    FieldBuilder.Integer("getPriceHistoryFidelity", "Fidelity (minutes)", { initialValue: 60, min: 1 }),
                ],
                outputs: [OutputBuilder.DataList("history", "History")],
            },

            "getClobResource==mechanics": {
                fields: [
                    FieldBuilder.String("getMarketMechanicsTokenId", "Token ID", { required: true }),
                ],
                outputs: [OutputBuilder.Data("mechanics", "Mechanics")],
            },

            "getClobResource==rewards": {
                fields: [
                    FieldBuilder.String("getMarketRewardsConditionId", "Condition ID", {
                        required:    true,
                        placeholder: "0x…",
                    }),
                ],
                outputs: [OutputBuilder.Data("rewards", "Rewards")],
            },
        },

        "getAPI==data": {
            fields: [
                FieldBuilder.MultiOption("getDataResource", "Resource", {
                    options: [
                        { value: "openInterest", displayName: "Open Interest" },
                        { value: "liveVolume",   displayName: "Live Volume"   },
                    ],
                    initialValue: "openInterest",
                }),
            ],

            "getDataResource==openInterest": {
                fields: [
                    FieldBuilder.String("getOpenInterestConditionId", "Condition ID", {
                        required:    true,
                        placeholder: "0x…",
                    }),
                ],
                outputs: [OutputBuilder.Data("openInterest", "Open Interest")],
            },

            "getDataResource==liveVolume": {
                fields: [
                    FieldBuilder.String("getLiveVolumeEventId", "Event ID", { required: true }),
                ],
                outputs: [OutputBuilder.Data("volume", "Volume")],
            },
        },
    },


    // No fields: in tool mode every input is per-call intent, so it belongs in a tool's schema
    // rather than on the node. The action/api/resource axes go too — the agent asks for a market,
    // it doesn't pick which Polymarket service owns markets. A node field here would only be
    // right for policy the agent must not override, and a read-only node has none.
    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Polymarket Tools")],
    }),
});
