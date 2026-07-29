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

const tradeSideOptions = [
    { value: "all",  displayName: "All"  },
    { value: "BUY",  displayName: "Buy"  },
    { value: "SELL", displayName: "Sell" },
] as const;


/**
 * Two axes, not three.
 *
 * This used to branch on action, then on which Polymarket API served it, then on the resource —
 * `action==get / getAPI==clob / getClobResource==orderBook`. The middle level asked the author
 * which of Gamma, CLOB or Data owns a concept, which is infrastructure: `PolymarketPublicSDK`
 * answers that now. The verb stays, because whether you are searching, browsing or fetching one
 * thing is a real choice.
 */
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
                { value: "search", displayName: "Search", description: "Find markets, or search events, tags and profiles at once." },
                { value: "list",   displayName: "List",   description: "Browse markets, events, series, trades, holders and more." },
                { value: "get",    displayName: "Get",    description: "Fetch one thing by id, or one reading for a token." },
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
                    { value: "markets", displayName: "Markets",    description: "Market questions, through Gamma's search index." },
                    { value: "all",     displayName: "Everything", description: "Events, and optionally tags and public profiles." },
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

        "searchKind==all": {
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
            FieldBuilder.MultiOption("listResource", "Resource", {
                options: [
                    { value: "markets",  displayName: "Markets"  },
                    { value: "events",   displayName: "Events"   },
                    { value: "series",   displayName: "Series",   description: "Recurring groups of events — leagues, monthly questions." },
                    { value: "tags",     displayName: "Tags"     },
                    { value: "sports",   displayName: "Sports"   },
                    { value: "teams",    displayName: "Teams"    },
                    { value: "comments", displayName: "Comments" },
                    { value: "trades",   displayName: "Trades",   description: "A market's public fills." },
                    { value: "holders",  displayName: "Holders",  description: "The largest position holders on each side." },
                ],
                initialValue: "markets",
            }),
        ],

        "listResource==markets": {
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

        "listResource==events": {
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

        "listResource==series": {
            fields: [
                FieldBuilder.String("listSeriesSlug", "Slug"),
                FieldBuilder.Integer("listSeriesMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [OutputBuilder.DataList("series", "Series")],
        },

        "listResource==tags": {
            fields: [
                FieldBuilder.Integer("listTagsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [OutputBuilder.DataList("tags", "Tags")],
        },

        "listResource==sports": {
            outputs: [OutputBuilder.DataList("sports", "Sports")],
        },

        "listResource==teams": {
            fields: [
                FieldBuilder.String("listTeamsName", "Team Name"),
                FieldBuilder.Integer("listTeamsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [OutputBuilder.DataList("teams", "Teams")],
        },

        // Deliberately absent from tool mode: comments are untrusted user text, and an agent that
        // may hold trading tools should not be reading them. A graph author wiring this can see
        // exactly what comes back.
        "listResource==comments": {
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

        "listResource==trades": {
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
                FieldBuilder.Integer("listTradesMaxResults", "Max Results", { initialValue: 100, min: 1, max: 1_000 }),
            ],
            outputs: [OutputBuilder.DataList("trades", "Trades")],
        },

        "listResource==holders": {
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


    "action==get": {
        fields: [
            FieldBuilder.MultiOption("getResource", "Resource", {
                options: [
                    { value: "market",       displayName: "Market"        },
                    { value: "marketStats",  displayName: "Market Stats",  description: "Volume windows, book snapshot, price movement." },
                    { value: "event",        displayName: "Event",         description: "An event and the markets it groups." },
                    { value: "eventStats",   displayName: "Event Stats",   description: "Volume, liquidity and open interest." },
                    { value: "series",       displayName: "Series"        },
                    { value: "tag",          displayName: "Tag"           },
                    { value: "price",        displayName: "Price",         description: "One reading for an outcome token." },
                    { value: "orderBook",    displayName: "Order Book"    },
                    { value: "priceHistory", displayName: "Price History" },
                    { value: "mechanics",    displayName: "Mechanics",     description: "Tick size, fee rate, neg-risk." },
                    { value: "marketConfig", displayName: "Market Config", description: "Exchange configuration — tokens, fees, rewards." },
                    { value: "rewards",      displayName: "Rewards"       },
                    { value: "openInterest", displayName: "Open Interest" },
                    { value: "liveVolume",   displayName: "Live Volume"   },
                ],
                initialValue: "market",
            }),
        ],

        // No look-up-by selector on any of these: numeric ids and kebab-case slugs are
        // distinguishable, so the SDK routes to the right endpoint itself.
        "getResource==market": {
            fields: [
                FieldBuilder.String("getMarketIdentifier", "Market ID or Slug", { required: true }),
            ],
            outputs: [OutputBuilder.Data("market", "Market")],
        },

        "getResource==marketStats": {
            fields: [
                FieldBuilder.String("getMarketStatsIdentifier", "Market ID or Slug", { required: true }),
            ],
            outputs: [OutputBuilder.Data("stats", "Stats")],
        },

        "getResource==event": {
            fields: [
                FieldBuilder.String("getEventIdentifier", "Event ID or Slug", { required: true }),
            ],
            outputs: [OutputBuilder.Data("event", "Event")],
        },

        "getResource==eventStats": {
            fields: [
                FieldBuilder.String("getEventStatsIdentifier", "Event ID or Slug", { required: true }),
            ],
            outputs: [OutputBuilder.Data("stats", "Stats")],
        },

        "getResource==series": {
            fields: [
                FieldBuilder.String("getSeriesIdentifier", "Series ID", { required: true }),
            ],
            outputs: [OutputBuilder.Data("series", "Series")],
        },

        "getResource==tag": {
            fields: [
                FieldBuilder.String("getTagIdentifier", "Tag ID or Slug", { required: true }),
            ],
            outputs: [OutputBuilder.Data("tag", "Tag")],
        },

        // Midpoint, best bid, best ask, last trade and spread were five separate branches; they
        // take the same argument and differ only in which number comes back.
        "getResource==price": {
            fields: [
                FieldBuilder.String("getPriceTokenId", "Token ID", { required: true }),
                FieldBuilder.MultiOption("getPriceKind", "Reading", {
                    options: [
                        { value: "midpoint", displayName: "Midpoint",   description: "Mid of the book." },
                        { value: "buy",      displayName: "Best Buy",   description: "Best price to buy at." },
                        { value: "sell",     displayName: "Best Sell",  description: "Best price to sell at." },
                        { value: "last",     displayName: "Last Trade", description: "Most recent fill." },
                        { value: "spread",   displayName: "Spread",     description: "Gap between bid and ask." },
                    ],
                    initialValue: "midpoint",
                }),
            ],
            outputs: [OutputBuilder.Data("price", "Price")],
        },

        "getResource==orderBook": {
            fields: [
                FieldBuilder.String("getOrderBookTokenId", "Token ID", { required: true }),
                FieldBuilder.Integer("getOrderBookDepth", "Depth", {
                    initialValue: 15,
                    min:          1,
                    max:          50,
                    tooltip:      "Price levels per side, best first. A full book is 200+ levels, nearly all far from the money.",
                }),
            ],
            outputs: [OutputBuilder.Data("orderBook", "Order Book")],
        },

        "getResource==priceHistory": {
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
                FieldBuilder.Integer("getPriceHistoryPoints", "Readings to return", { initialValue: 60, min: 2 }),
            ],
            outputs: [OutputBuilder.Data("history", "History")],
        },

        "getResource==mechanics": {
            fields: [
                FieldBuilder.String("getMarketMechanicsTokenId", "Token ID", { required: true }),
            ],
            outputs: [OutputBuilder.Data("mechanics", "Mechanics")],
        },

        "getResource==marketConfig": {
            fields: [
                FieldBuilder.String("getClobMarketConditionId", "Condition ID", {
                    required:    true,
                    placeholder: "0x…",
                }),
            ],
            outputs: [OutputBuilder.Data("market", "Market")],
        },

        "getResource==rewards": {
            fields: [
                FieldBuilder.String("getMarketRewardsConditionId", "Condition ID", {
                    required:    true,
                    placeholder: "0x…",
                }),
            ],
            outputs: [OutputBuilder.Data("rewards", "Rewards")],
        },

        "getResource==openInterest": {
            fields: [
                FieldBuilder.String("getOpenInterestConditionId", "Condition ID", {
                    required:    true,
                    placeholder: "0x…",
                }),
            ],
            outputs: [OutputBuilder.Data("openInterest", "Open Interest")],
        },

        "getResource==liveVolume": {
            fields: [
                FieldBuilder.String("getLiveVolumeEventId", "Event ID", { required: true }),
            ],
            outputs: [OutputBuilder.Data("volume", "Volume")],
        },
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Polymarket Tools")],
    }),
});
