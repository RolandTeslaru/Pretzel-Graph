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
 * One axis, not three.
 *
 * This used to branch on action, then on which Polymarket API served it, then on the resource —
 * `action==get / getAPI==clob / getClobResource==orderBook`. The middle level asked the author
 * which of Gamma, CLOB or Data owns a concept, which is infrastructure: `PolymarketPublicSDK`
 * answers it now. What's left is the operation.
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
        FieldBuilder.MultiOption("resource", "Operation", {
            options: [
                { value: "searchMarkets",   displayName: "Search Markets",   description: "Full-text search across market questions." },
                { value: "search",          displayName: "Search Everything", description: "Events, and optionally tags and public profiles." },

                { value: "listMarkets",     displayName: "List Markets",     description: "Markets by volume, highest first." },
                { value: "getMarket",       displayName: "Get Market",       description: "One market in full, by id or slug." },
                { value: "getMarketStats",  displayName: "Market Stats",     description: "Volume windows, book snapshot and price movement." },

                { value: "listEvents",      displayName: "List Events",      description: "Events by volume." },
                { value: "getEvent",        displayName: "Get Event",        description: "One event and the markets it groups." },
                { value: "getEventStats",   displayName: "Event Stats",      description: "Volume, liquidity and open interest for an event." },

                { value: "listSeries",      displayName: "List Series",      description: "Recurring groups of events — leagues, monthly questions." },
                { value: "getSeries",       displayName: "Get Series",       description: "One series and a sample of its events." },

                { value: "listTags",        displayName: "List Tags",        description: "Topic labels." },
                { value: "getTag",          displayName: "Get Tag",          description: "One tag, by id or slug." },

                { value: "listSports",      displayName: "List Sports",      description: "Leagues with markets." },
                { value: "listTeams",       displayName: "List Teams",       description: "Teams, optionally filtered by name." },
                { value: "listComments",    displayName: "List Comments",    description: "User comments on an event, series or market." },

                { value: "listTrades",      displayName: "List Trades",      description: "A market's public fills." },
                { value: "listHolders",     displayName: "List Holders",     description: "The largest position holders on each side." },

                { value: "getPrice",        displayName: "Get Price",        description: "One price reading for an outcome token." },
                { value: "getOrderBook",    displayName: "Get Order Book",   description: "Resting bids and asks, best first." },
                { value: "getPriceHistory", displayName: "Price History",    description: "A time series of prices." },
                { value: "getMechanics",    displayName: "Get Mechanics",    description: "Tick size, fee rate and neg-risk for a token." },

                { value: "getMarketConfig", displayName: "Market Config",    description: "Exchange configuration — tokens, fees, rewards." },
                { value: "getRewards",      displayName: "Market Rewards",   description: "The liquidity reward programme, if any." },

                { value: "getOpenInterest", displayName: "Open Interest",    description: "Total value riding on a market." },
                { value: "getLiveVolume",   displayName: "Live Volume",      description: "Current trading volume for an event." },
            ],
            initialValue: "searchMarkets",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==searchMarkets": {
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

    "resource==search": {
        fields: [
            FieldBuilder.String("publicSearchQuery", "Query", { required: true, placeholder: "election" }),
            FieldBuilder.Boolean("publicSearchSearchTags", "Include Tags", { initialValue: false }),
            FieldBuilder.Boolean("publicSearchSearchProfiles", "Include Profiles", { initialValue: false }),
            FieldBuilder.Integer("publicSearchMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
        ],
        outputs: [OutputBuilder.Data("results", "Results")],
    },


    "resource==listMarkets": {
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

    // No look-up-by selector: numeric ids and kebab-case slugs are distinguishable, so the SDK
    // routes to the right endpoint rather than making the author declare which they hold.
    "resource==getMarket": {
        fields: [
            FieldBuilder.String("getMarketIdentifier", "Market ID or Slug", { required: true }),
        ],
        outputs: [OutputBuilder.Data("market", "Market")],
    },

    "resource==getMarketStats": {
        fields: [
            FieldBuilder.String("getMarketStatsIdentifier", "Market ID or Slug", { required: true }),
        ],
        outputs: [OutputBuilder.Data("stats", "Stats")],
    },


    "resource==listEvents": {
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

    "resource==getEvent": {
        fields: [
            FieldBuilder.String("getEventIdentifier", "Event ID or Slug", { required: true }),
        ],
        outputs: [OutputBuilder.Data("event", "Event")],
    },

    "resource==getEventStats": {
        fields: [
            FieldBuilder.String("getEventStatsIdentifier", "Event ID or Slug", { required: true }),
        ],
        outputs: [OutputBuilder.Data("stats", "Stats")],
    },


    "resource==listSeries": {
        fields: [
            FieldBuilder.String("listSeriesSlug", "Slug"),
            FieldBuilder.Integer("listSeriesMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
        ],
        outputs: [OutputBuilder.DataList("series", "Series")],
    },

    "resource==getSeries": {
        fields: [
            FieldBuilder.String("getSeriesIdentifier", "Series ID", { required: true }),
        ],
        outputs: [OutputBuilder.Data("series", "Series")],
    },


    "resource==listTags": {
        fields: [
            FieldBuilder.Integer("listTagsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
        ],
        outputs: [OutputBuilder.DataList("tags", "Tags")],
    },

    "resource==getTag": {
        fields: [
            FieldBuilder.String("getTagIdentifier", "Tag ID or Slug", { required: true }),
        ],
        outputs: [OutputBuilder.Data("tag", "Tag")],
    },


    "resource==listSports": {
        outputs: [OutputBuilder.DataList("sports", "Sports")],
    },

    "resource==listTeams": {
        fields: [
            FieldBuilder.String("listTeamsName", "Team Name"),
            FieldBuilder.Integer("listTeamsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
        ],
        outputs: [OutputBuilder.DataList("teams", "Teams")],
    },

    // Not exposed as a tool: comments are untrusted user text, and an agent holding trading tools
    // should not be reading them. A graph author wiring this can see what comes back.
    "resource==listComments": {
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


    "resource==listTrades": {
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

    "resource==listHolders": {
        fields: [
            FieldBuilder.String("listHoldersConditionId", "Condition ID", {
                required:    true,
                placeholder: "0x…",
            }),
            FieldBuilder.Integer("listHoldersMaxResults", "Max Results", { initialValue: 20, min: 1, max: 20 }),
        ],
        outputs: [OutputBuilder.DataList("holders", "Holders")],
    },


    // Midpoint, best bid, best ask, last trade and spread were five separate branches; they take
    // the same argument and differ only in which number comes back.
    "resource==getPrice": {
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

    "resource==getOrderBook": {
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

    "resource==getPriceHistory": {
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

    "resource==getMechanics": {
        fields: [
            FieldBuilder.String("getMarketMechanicsTokenId", "Token ID", { required: true }),
        ],
        outputs: [OutputBuilder.Data("mechanics", "Mechanics")],
    },


    "resource==getMarketConfig": {
        fields: [
            FieldBuilder.String("getClobMarketConditionId", "Condition ID", {
                required:    true,
                placeholder: "0x…",
            }),
        ],
        outputs: [OutputBuilder.Data("market", "Market")],
    },

    "resource==getRewards": {
        fields: [
            FieldBuilder.String("getMarketRewardsConditionId", "Condition ID", {
                required:    true,
                placeholder: "0x…",
            }),
        ],
        outputs: [OutputBuilder.Data("rewards", "Rewards")],
    },


    "resource==getOpenInterest": {
        fields: [
            FieldBuilder.String("getOpenInterestConditionId", "Condition ID", {
                required:    true,
                placeholder: "0x…",
            }),
        ],
        outputs: [OutputBuilder.Data("openInterest", "Open Interest")],
    },

    "resource==getLiveVolume": {
        fields: [
            FieldBuilder.String("getLiveVolumeEventId", "Event ID", { required: true }),
        ],
        outputs: [OutputBuilder.Data("volume", "Volume")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Polymarket Tools")],
    }),
});
