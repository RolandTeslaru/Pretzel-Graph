"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const statusOptions = [
    { value: "active", displayName: "Active" },
    { value: "closed", displayName: "Closed" },
    { value: "all", displayName: "All" },
];
const tradeSideOptions = [
    { value: "all", displayName: "All" },
    { value: "BUY", displayName: "Buy" },
    { value: "SELL", displayName: "Sell" },
];
/**
 * Two axes, not three.
 *
 * This used to branch on action, then on which Polymarket API served it, then on the resource —
 * `action==get / getAPI==clob / getClobResource==orderBook`. The middle level asked the author
 * which of Gamma, CLOB or Data owns a concept, which is infrastructure: `PolymarketPublicSDK`
 * answers that now. The verb stays, because whether you are searching, browsing or fetching one
 * thing is a real choice.
 */
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Polymarket.Market",
    displayName: "Polymarket Market",
    description: "Searches Polymarket and reads public market metadata, exchange state, and analytics.",
    icon: "Polymarket",
    accent: "port-DataList",
    proxyCompatible: true,
    toolCompatible: true,
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("action", "Action", {
            options: [
                { value: "search", displayName: "Search", description: "Find markets, or search events, tags and profiles at once." },
                { value: "list", displayName: "List", description: "Browse markets, events, series, trades, holders and more." },
                { value: "get", displayName: "Get", description: "Fetch one thing by id, or one reading for a token." },
            ],
            initialValue: "search",
        }),
    ],
    inputs: [],
    outputs: [],
    "action==search": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("searchKind", "Search", {
                options: [
                    { value: "markets", displayName: "Markets", description: "Market questions, through Gamma's search index." },
                    { value: "all", displayName: "Everything", description: "Events, and optionally tags and public profiles." },
                ],
                initialValue: "markets",
                variant: "tab",
            }),
        ],
        "searchKind==markets": {
            fields: [
                node_sdk_1.FieldBuilder.String("searchMarketsQuery", "Query", { placeholder: "election" }),
                node_sdk_1.FieldBuilder.MultiOption("searchMarketsStatus", "Status", {
                    options: statusOptions,
                    initialValue: "active",
                    variant: "tab",
                }),
                node_sdk_1.FieldBuilder.Integer("searchMarketsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("markets", "Markets")],
        },
        "searchKind==all": {
            fields: [
                node_sdk_1.FieldBuilder.String("publicSearchQuery", "Query", { required: true, placeholder: "election" }),
                node_sdk_1.FieldBuilder.Boolean("publicSearchSearchTags", "Include Tags", { initialValue: false }),
                node_sdk_1.FieldBuilder.Boolean("publicSearchSearchProfiles", "Include Profiles", { initialValue: false }),
                node_sdk_1.FieldBuilder.Integer("publicSearchMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("results", "Results")],
        },
    },
    "action==list": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("listResource", "Resource", {
                options: [
                    { value: "markets", displayName: "Markets" },
                    { value: "events", displayName: "Events" },
                    { value: "series", displayName: "Series", description: "Recurring groups of events — leagues, monthly questions." },
                    { value: "tags", displayName: "Tags" },
                    { value: "sports", displayName: "Sports" },
                    { value: "teams", displayName: "Teams" },
                    { value: "comments", displayName: "Comments" },
                    { value: "trades", displayName: "Trades", description: "A market's public fills." },
                    { value: "holders", displayName: "Holders", description: "The largest position holders on each side." },
                ],
                initialValue: "markets",
            }),
        ],
        "listResource==markets": {
            fields: [
                node_sdk_1.FieldBuilder.MultiOption("listMarketsStatus", "Status", {
                    options: statusOptions,
                    initialValue: "active",
                    variant: "tab",
                }),
                node_sdk_1.FieldBuilder.Integer("listMarketsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("markets", "Markets")],
        },
        "listResource==events": {
            fields: [
                node_sdk_1.FieldBuilder.MultiOption("listEventsStatus", "Status", {
                    options: statusOptions,
                    initialValue: "active",
                    variant: "tab",
                }),
                node_sdk_1.FieldBuilder.Integer("listEventsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("events", "Events")],
        },
        "listResource==series": {
            fields: [
                node_sdk_1.FieldBuilder.String("listSeriesSlug", "Slug"),
                node_sdk_1.FieldBuilder.Integer("listSeriesMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("series", "Series")],
        },
        "listResource==tags": {
            fields: [
                node_sdk_1.FieldBuilder.Integer("listTagsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("tags", "Tags")],
        },
        "listResource==sports": {
            outputs: [node_sdk_1.OutputBuilder.DataList("sports", "Sports")],
        },
        "listResource==teams": {
            fields: [
                node_sdk_1.FieldBuilder.String("listTeamsName", "Team Name"),
                node_sdk_1.FieldBuilder.Integer("listTeamsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("teams", "Teams")],
        },
        // Deliberately absent from tool mode: comments are untrusted user text, and an agent that
        // may hold trading tools should not be reading them. A graph author wiring this can see
        // exactly what comes back.
        "listResource==comments": {
            fields: [
                node_sdk_1.FieldBuilder.MultiOption("listCommentsParentEntityType", "Parent Type", {
                    options: [
                        { value: "Event", displayName: "Event" },
                        { value: "Series", displayName: "Series" },
                        { value: "market", displayName: "Market" },
                    ],
                    initialValue: "Event",
                    variant: "tab",
                }),
                node_sdk_1.FieldBuilder.String("listCommentsParentId", "Parent ID", { required: true }),
                node_sdk_1.FieldBuilder.Boolean("listCommentsGetPositions", "Include Positions", { initialValue: false }),
                node_sdk_1.FieldBuilder.Boolean("listCommentsHoldersOnly", "Holders Only", { initialValue: false }),
                node_sdk_1.FieldBuilder.Integer("listCommentsMaxResults", "Max Results", { initialValue: 20, min: 1, max: 500 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("comments", "Comments")],
        },
        "listResource==trades": {
            fields: [
                node_sdk_1.FieldBuilder.String("listTradesConditionId", "Condition ID", {
                    required: true,
                    placeholder: "0x…",
                }),
                node_sdk_1.FieldBuilder.MultiOption("listTradesSide", "Side", {
                    options: tradeSideOptions,
                    initialValue: "all",
                    variant: "tab",
                }),
                node_sdk_1.FieldBuilder.Integer("listTradesMaxResults", "Max Results", { initialValue: 100, min: 1, max: 1_000 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("trades", "Trades")],
        },
        "listResource==holders": {
            fields: [
                node_sdk_1.FieldBuilder.String("listHoldersConditionId", "Condition ID", {
                    required: true,
                    placeholder: "0x…",
                }),
                node_sdk_1.FieldBuilder.Integer("listHoldersMaxResults", "Max Results", { initialValue: 20, min: 1, max: 20 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.DataList("holders", "Holders")],
        },
    },
    "action==get": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("getResource", "Resource", {
                options: [
                    { value: "market", displayName: "Market" },
                    { value: "marketStats", displayName: "Market Stats", description: "Volume windows, book snapshot, price movement." },
                    { value: "event", displayName: "Event", description: "An event and the markets it groups." },
                    { value: "eventStats", displayName: "Event Stats", description: "Volume, liquidity and open interest." },
                    { value: "series", displayName: "Series" },
                    { value: "tag", displayName: "Tag" },
                    { value: "price", displayName: "Price", description: "One reading for an outcome token." },
                    { value: "orderBook", displayName: "Order Book" },
                    { value: "priceHistory", displayName: "Price History" },
                    { value: "mechanics", displayName: "Mechanics", description: "Tick size, fee rate, neg-risk." },
                    { value: "marketConfig", displayName: "Market Config", description: "Exchange configuration — tokens, fees, rewards." },
                    { value: "rewards", displayName: "Rewards" },
                    { value: "openInterest", displayName: "Open Interest" },
                    { value: "liveVolume", displayName: "Live Volume" },
                ],
                initialValue: "market",
            }),
        ],
        // No look-up-by selector on any of these: numeric ids and kebab-case slugs are
        // distinguishable, so the SDK routes to the right endpoint itself.
        "getResource==market": {
            fields: [
                node_sdk_1.FieldBuilder.String("getMarketIdentifier", "Market ID or Slug", { required: true }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("market", "Market")],
        },
        "getResource==marketStats": {
            fields: [
                node_sdk_1.FieldBuilder.String("getMarketStatsIdentifier", "Market ID or Slug", { required: true }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("stats", "Stats")],
        },
        "getResource==event": {
            fields: [
                node_sdk_1.FieldBuilder.String("getEventIdentifier", "Event ID or Slug", { required: true }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("event", "Event")],
        },
        "getResource==eventStats": {
            fields: [
                node_sdk_1.FieldBuilder.String("getEventStatsIdentifier", "Event ID or Slug", { required: true }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("stats", "Stats")],
        },
        "getResource==series": {
            fields: [
                node_sdk_1.FieldBuilder.String("getSeriesIdentifier", "Series ID", { required: true }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("series", "Series")],
        },
        "getResource==tag": {
            fields: [
                node_sdk_1.FieldBuilder.String("getTagIdentifier", "Tag ID or Slug", { required: true }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("tag", "Tag")],
        },
        // Midpoint, best bid, best ask, last trade and spread were five separate branches; they
        // take the same argument and differ only in which number comes back.
        "getResource==price": {
            fields: [
                node_sdk_1.FieldBuilder.String("getPriceTokenId", "Token ID", { required: true }),
                node_sdk_1.FieldBuilder.MultiOption("getPriceKind", "Reading", {
                    options: [
                        { value: "midpoint", displayName: "Midpoint", description: "Mid of the book." },
                        { value: "buy", displayName: "Best Buy", description: "Best price to buy at." },
                        { value: "sell", displayName: "Best Sell", description: "Best price to sell at." },
                        { value: "last", displayName: "Last Trade", description: "Most recent fill." },
                        { value: "spread", displayName: "Spread", description: "Gap between bid and ask." },
                    ],
                    initialValue: "midpoint",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("price", "Price")],
        },
        "getResource==orderBook": {
            fields: [
                node_sdk_1.FieldBuilder.String("getOrderBookTokenId", "Token ID", { required: true }),
                node_sdk_1.FieldBuilder.Integer("getOrderBookDepth", "Depth", {
                    initialValue: 15,
                    min: 1,
                    max: 50,
                    tooltip: "Price levels per side, best first. A full book is 200+ levels, nearly all far from the money.",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("orderBook", "Order Book")],
        },
        "getResource==priceHistory": {
            fields: [
                node_sdk_1.FieldBuilder.String("getPriceHistoryTokenId", "Token ID", { required: true }),
                node_sdk_1.FieldBuilder.MultiOption("getPriceHistoryInterval", "Interval", {
                    options: [
                        { value: "1h", displayName: "1 hour" },
                        { value: "6h", displayName: "6 hours" },
                        { value: "1d", displayName: "1 day" },
                        { value: "1w", displayName: "1 week" },
                        { value: "max", displayName: "Max" },
                    ],
                    initialValue: "1d",
                }),
                node_sdk_1.FieldBuilder.Integer("getPriceHistoryFidelity", "Fidelity (minutes)", { initialValue: 60, min: 1 }),
                node_sdk_1.FieldBuilder.Integer("getPriceHistoryPoints", "Readings to return", { initialValue: 60, min: 2 }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("history", "History")],
        },
        "getResource==mechanics": {
            fields: [
                node_sdk_1.FieldBuilder.String("getMarketMechanicsTokenId", "Token ID", { required: true }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("mechanics", "Mechanics")],
        },
        "getResource==marketConfig": {
            fields: [
                node_sdk_1.FieldBuilder.String("getClobMarketConditionId", "Condition ID", {
                    required: true,
                    placeholder: "0x…",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("market", "Market")],
        },
        "getResource==rewards": {
            fields: [
                node_sdk_1.FieldBuilder.String("getMarketRewardsConditionId", "Condition ID", {
                    required: true,
                    placeholder: "0x…",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("rewards", "Rewards")],
        },
        "getResource==openInterest": {
            fields: [
                node_sdk_1.FieldBuilder.String("getOpenInterestConditionId", "Condition ID", {
                    required: true,
                    placeholder: "0x…",
                }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("openInterest", "Open Interest")],
        },
        "getResource==liveVolume": {
            fields: [
                node_sdk_1.FieldBuilder.String("getLiveVolumeEventId", "Event ID", { required: true }),
            ],
            outputs: [node_sdk_1.OutputBuilder.Data("volume", "Volume")],
        },
    },
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: [],
        inputs: [],
        outputs: [
            node_sdk_1.OutputBuilder.ToolList("discoveryTools", "Discovery Tools"),
            node_sdk_1.OutputBuilder.ToolList("exchangeTools", "Exchange Tools"),
            node_sdk_1.OutputBuilder.ToolList("analyticsTools", "Analytics Tools"),
        ],
    }),
});
