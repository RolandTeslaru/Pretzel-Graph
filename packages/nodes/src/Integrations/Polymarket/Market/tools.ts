import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import type {
    PolymarketDataClient,
    PolymarketGammaClient,
    PolymarketUnauthenticatedCLOBClient,
} from "../client";
import { Polymarket } from "../domain";
import { clampLimit, listEvents, listMarkets, searchMarketsLocal } from "./query";
import type { MarketStatus } from "./shapes";


export interface ToolClients {
    gamma: PolymarketGammaClient;
    clob:  PolymarketUnauthenticatedCLOBClient;
    data:  PolymarketDataClient;
}


// Tool mode declares no node fields — every input is per-call intent, so defaults live in the
// schema rather than in the editor. The run-mode action/api/resource axes disappear entirely:
// which Polymarket service backs a tool is infrastructure, not something the agent chooses.
const statusParam = z.enum(["active", "closed", "all"]).default("active")
    .describe("Which markets to include.");

const limitParam = (maximum: number, fallback: number) =>
    z.number().int().min(1).max(maximum).default(fallback)
        .describe(`Maximum records to return (1-${maximum}).`);

const tokenIdParam = z.string()
    .describe("Token id for a single outcome, taken from a market's clobTokenIds array.");

const conditionIdParam = z.string()
    .describe("Market condition id (0x…), taken from a market's conditionId field.");


const required = (value: string | undefined, name: string, toolName: string) => {
    const text = (value ?? "").trim();

    if (!text)
        throw new Error(`${toolName}: '${name}' is required.`);

    return text;
};

const wholeNumber = (value: string, name: string, toolName: string) => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1)
        throw new Error(`${toolName}: '${name}' must be a positive integer.`);

    return parsed;
};

// Gamma ids are numeric and slugs are kebab-case, so the node routes to the right endpoint itself
// rather than making the agent declare which kind it holds.
const looksNumeric = (value: string) => /^\d+$/.test(value);


export function buildTools(clients: ToolClients) {

    const searchMarkets = tool(
        async ({ query, status, limit }) => {
            const cap        = clampLimit(limit, 20);
            const text       = (query ?? "").trim();
            const fetchLimit = text ? Math.max(cap, 100) : cap;
            const markets    = await listMarkets(clients.gamma, status as MarketStatus, fetchLimit);
            const matched    = searchMarketsLocal(markets, text, cap);

            return JSON.stringify({ count: matched.length, markets: matched });
        },
        {
            name:        "polymarket_search_markets",
            description: "Search markets by a substring of the question or slug. Returns markets with their outcomes, outcome prices, conditionId and clobTokenIds — the ids other tools need.",
            schema: z.object({
                query:  z.string().optional().describe("Substring to match against the market question or slug. Omit to get the top markets by volume."),
                status: statusParam,
                limit:  limitParam(500, 20),
            }),
        },
    );

    const searchAll = tool(
        async ({ query, includeTags, includeProfiles, limit }) => {
            const results = await clients.gamma.search.public({
                q:               required(query, "query", "polymarket_search_all"),
                limit_per_type:  clampLimit(limit, 20),
                search_tags:     includeTags,
                search_profiles: includeProfiles,
            });

            return JSON.stringify(results);
        },
        {
            name:        "polymarket_search_all",
            description: "Search across events, markets and optionally tags and public profiles at once. Use when you don't yet know whether the subject is a market, an event or a tag.",
            schema: z.object({
                query:           z.string().describe("Free-text search term."),
                includeTags:     z.boolean().default(false).describe("Also match tags."),
                includeProfiles: z.boolean().default(false).describe("Also match public user profiles."),
                limit:           limitParam(500, 20),
            }),
        },
    );


    const listMarketsTool = tool(
        async ({ status, limit }) => {
            const markets = await listMarkets(clients.gamma, status as MarketStatus, clampLimit(limit, 20));

            return JSON.stringify({ count: markets.length, markets });
        },
        {
            name:        "polymarket_list_markets",
            description: "List markets ordered by volume, highest first. Returns conditionId and clobTokenIds for each market.",
            schema: z.object({
                status: statusParam,
                limit:  limitParam(500, 20),
            }),
        },
    );

    const getMarket = tool(
        async ({ identifier }) => {
            const key    = required(identifier, "identifier", "polymarket_get_market");
            const market = looksNumeric(key)
                ? await clients.gamma.markets.getById({ id: Polymarket.Gamma.Market.Id.parse(key) })
                : await clients.gamma.markets.getBySlug({ slug: key });

            return JSON.stringify(market);
        },
        {
            name:        "polymarket_get_market",
            description: "Fetch one market in full, including outcomes, outcome prices, conditionId and clobTokenIds.",
            schema: z.object({
                identifier: z.string().describe("Numeric market id (e.g. 12345) or market slug (e.g. 'will-x-happen'). Either works."),
            }),
        },
    );

    const listEventsTool = tool(
        async ({ status, limit }) => {
            const events = await listEvents(clients.gamma, status as MarketStatus, clampLimit(limit, 20));

            return JSON.stringify({ count: events.length, events });
        },
        {
            name:        "polymarket_list_events",
            description: "List events ordered by volume. An event groups several related markets — use polymarket_get_event to see the markets inside one.",
            schema: z.object({
                status: statusParam,
                limit:  limitParam(500, 20),
            }),
        },
    );

    const getEvent = tool(
        async ({ identifier }) => {
            const key   = required(identifier, "identifier", "polymarket_get_event");
            const event = looksNumeric(key)
                ? await clients.gamma.events.getById({ id: Polymarket.Gamma.Event.Id.parse(key) })
                : await clients.gamma.events.getBySlug({ slug: key });

            return JSON.stringify(event);
        },
        {
            name:        "polymarket_get_event",
            description: "Fetch one event in full, including the markets it groups. The event's numeric id is what polymarket_get_live_volume expects.",
            schema: z.object({
                identifier: z.string().describe("Numeric event id or event slug. Either works."),
            }),
        },
    );


    const listTags = tool(
        async ({ limit }) => {
            const tags = await clients.gamma.tags.list({ limit: clampLimit(limit, 20) });

            return JSON.stringify({ count: tags.length, tags });
        },
        {
            name:        "polymarket_list_tags",
            description: "List tags. Tags are the topic labels markets and events are filed under (politics, sports, crypto, …).",
            schema: z.object({
                limit: limitParam(500, 20),
            }),
        },
    );

    const getTag = tool(
        async ({ identifier }) => {
            const key = required(identifier, "identifier", "polymarket_get_tag");
            const tag = looksNumeric(key)
                ? await clients.gamma.tags.getById({ id: Polymarket.Gamma.Tag.Id.parse(key) })
                : await clients.gamma.tags.getBySlug({ slug: key });

            return JSON.stringify(tag);
        },
        {
            name:        "polymarket_get_tag",
            description: "Fetch one tag by numeric id or slug.",
            schema: z.object({
                identifier: z.string().describe("Numeric tag id or tag slug. Either works."),
            }),
        },
    );

    const listSeries = tool(
        async ({ slug, limit }) => {
            const key    = (slug ?? "").trim();
            const series = await clients.gamma.series.list({
                limit: clampLimit(limit, 20),
                slug:  key ? [key] : undefined,
            });

            return JSON.stringify({ count: series.length, series });
        },
        {
            name:        "polymarket_list_series",
            description: "List series. A series is a recurring group of events (a league season, a repeating monthly market).",
            schema: z.object({
                slug:  z.string().optional().describe("Restrict to a single series slug."),
                limit: limitParam(500, 20),
            }),
        },
    );

    const getSeries = tool(
        async ({ seriesId }) => {
            const series = await clients.gamma.series.getById({
                id: Polymarket.Gamma.Series.Id.parse(
                    required(seriesId, "seriesId", "polymarket_get_series"),
                ),
            });

            return JSON.stringify(series);
        },
        {
            name:        "polymarket_get_series",
            description: "Fetch one series by id. Unlike markets and events, series are addressable by id only — use polymarket_list_series with a slug to find the id.",
            schema: z.object({
                seriesId: z.string().describe("Numeric series id."),
            }),
        },
    );

    const listSports = tool(
        async () => {
            const sports = await clients.gamma.sports.list({});

            return JSON.stringify({ count: sports.length, sports });
        },
        {
            name:        "polymarket_list_sports",
            description: "List the sports leagues that have markets (NBA, EPL, NFL, …). Takes no arguments.",
            schema: z.object({}),
        },
    );

    const listTeams = tool(
        async ({ name, limit }) => {
            const key   = (name ?? "").trim();
            const teams = await clients.gamma.sports.listTeams({
                limit: clampLimit(limit, 20),
                name:  key ? [key] : undefined,
            });

            return JSON.stringify({ count: teams.length, teams });
        },
        {
            name:        "polymarket_list_teams",
            description: "List sports teams, optionally filtered by name.",
            schema: z.object({
                name:  z.string().optional().describe("Restrict to a single team name."),
                limit: limitParam(500, 20),
            }),
        },
    );


    const listComments = tool(
        async ({ parentType, parentId, includePositions, holdersOnly, limit }) => {
            const comments = await clients.gamma.comments.list({
                parent_entity_type: Polymarket.Gamma.Comment.ParentEntityType.parse(parentType),
                parent_entity_id:   wholeNumber(
                    required(parentId, "parentId", "polymarket_list_comments"),
                    "parentId",
                    "polymarket_list_comments",
                ),
                get_positions: includePositions,
                holders_only:  holdersOnly,
                limit:         clampLimit(limit, 20),
            });

            return JSON.stringify({ count: comments.length, comments });
        },
        {
            name:        "polymarket_list_comments",
            description: "List user comments on an event, series or market. Useful for gauging sentiment around a question.",
            schema: z.object({
                parentType:       z.enum(["Event", "Series", "market"]).describe("What the comments are attached to. Note the casing — 'Event', 'Series', lowercase 'market'."),
                parentId:         z.string().describe("Numeric id of the event, series or market."),
                includePositions: z.boolean().default(false).describe("Include each commenter's position in the market."),
                holdersOnly:      z.boolean().default(false).describe("Only comments from users who hold a position."),
                limit:            limitParam(500, 20),
            }),
        },
    );

    const listTrades = tool(
        async ({ conditionId, side, limit }) => {
            const market = Polymarket.Data.Common.ConditionId.parse(
                required(conditionId, "conditionId", "polymarket_list_trades"),
            );

            const trades = await clients.data.trades.list({
                market: [market],
                limit:  clampLimit(limit, 100, 10_000),
                side:   side === "all" ? undefined : Polymarket.Data.Common.Side.parse(side),
            });

            return JSON.stringify({ count: trades.length, trades });
        },
        {
            name:        "polymarket_list_trades",
            description: "List recent executed trades for a market. Shows what actually filled, as opposed to the resting orders in polymarket_get_order_book.",
            schema: z.object({
                conditionId: conditionIdParam,
                side:        z.enum(["all", "BUY", "SELL"]).default("all").describe("Restrict to one side of the book."),
                limit:       limitParam(10_000, 100),
            }),
        },
    );

    const listHolders = tool(
        async ({ conditionId, limit }) => {
            const market = Polymarket.Data.Common.ConditionId.parse(
                required(conditionId, "conditionId", "polymarket_list_holders"),
            );

            const holders = await clients.data.markets.listHolders({
                market: [market],
                limit:  clampLimit(limit, 20, 20),
            });

            return JSON.stringify(holders);
        },
        {
            name:        "polymarket_list_holders",
            description: "List the largest position holders in a market, with their sizes. Capped at 20.",
            schema: z.object({
                conditionId: conditionIdParam,
                limit:       limitParam(20, 20),
            }),
        },
    );


    const getPrice = tool(
        async ({ tokenId, kind }) => {
            const token = required(tokenId, "tokenId", "polymarket_get_price");

            switch (kind) {
                case "midpoint":
                    return JSON.stringify(await clients.clob.marketData.getMidpoint({ token_id: token }));

                case "spread":
                    return JSON.stringify(await clients.clob.marketData.getSpread({ token_id: token }));

                case "last":
                    return JSON.stringify(await clients.clob.marketData.getLastTradePrice({ token_id: token }));

                default:
                    return JSON.stringify(await clients.clob.marketData.getPrice({
                        token_id: token,
                        side:     Polymarket.CLOB.Common.Side.parse(kind === "buy" ? "BUY" : "SELL"),
                    }));
            }
        },
        {
            name:        "polymarket_get_price",
            description: "Get a single current price reading for one outcome token: the midpoint, the best buy or sell price, the last traded price, or the bid-ask spread.",
            schema: z.object({
                tokenId: tokenIdParam,
                kind:    z.enum(["midpoint", "buy", "sell", "last", "spread"]).default("midpoint")
                    .describe("Which reading to return. 'midpoint' is the mid of the book, 'buy'/'sell' the best price on that side, 'last' the most recent fill, 'spread' the gap between bid and ask."),
            }),
        },
    );

    const getOrderBook = tool(
        async ({ tokenId }) => {
            const book = await clients.clob.marketData.getOrderBook({
                token_id: required(tokenId, "tokenId", "polymarket_get_order_book"),
            });

            return JSON.stringify(book);
        },
        {
            name:        "polymarket_get_order_book",
            description: "Snapshot the full order book — every resting bid and ask with its size — for one outcome token. Use polymarket_get_price if you only need a single number.",
            schema: z.object({
                tokenId: tokenIdParam,
            }),
        },
    );

    const getPriceHistory = tool(
        async ({ tokenId, interval, fidelity }) => {
            const history = await clients.clob.marketData.getPriceHistory({
                market:   required(tokenId, "tokenId", "polymarket_get_price_history"),
                interval: Polymarket.CLOB.Common.PriceHistoryInterval.parse(interval),
                fidelity,
            });

            return JSON.stringify({ count: history.length, history });
        },
        {
            name:        "polymarket_get_price_history",
            description: "Get a time series of prices for one outcome token, for charting or trend questions.",
            schema: z.object({
                tokenId:  tokenIdParam,
                interval: z.enum(["1h", "6h", "1d", "1w", "max"]).default("1d").describe("How far back to go."),
                fidelity: z.number().int().min(1).default(60).describe("Resolution in minutes between points."),
            }),
        },
    );

    const getMarketMechanics = tool(
        async ({ tokenId }) => {
            const token = required(tokenId, "tokenId", "polymarket_get_market_mechanics");

            const [tickSize, negRisk, feeRate, feeExponent] = await Promise.all([
                clients.clob.marketData.getTickSize({ token_id: token }),
                clients.clob.marketData.getNegRisk({ token_id: token }),
                clients.clob.marketData.getFeeRate({ token_id: token }),
                clients.clob.marketData.getFeeExponent({ token_id: token }),
            ]);

            return JSON.stringify({ tokenId: token, tickSize, negRisk, feeRate, feeExponent });
        },
        {
            name:        "polymarket_get_market_mechanics",
            description: "Get the trading mechanics for one outcome token: minimum price increment, fee rate, fee exponent, and whether the market is negative-risk.",
            schema: z.object({
                tokenId: tokenIdParam,
            }),
        },
    );


    const getMarketConfig = tool(
        async ({ conditionId }) => {
            const config = await clients.clob.markets.getClobInfo({
                condition_id: required(conditionId, "conditionId", "polymarket_get_market_config"),
            });

            return JSON.stringify(config);
        },
        {
            name:        "polymarket_get_market_config",
            description: "Get a market's exchange configuration — how it trades, its token ids and its accepting-orders state. This is not the market's question or description; use polymarket_get_market for that.",
            schema: z.object({
                conditionId: conditionIdParam,
            }),
        },
    );

    const getMarketRewards = tool(
        async ({ conditionId }) => {
            const rewards = await clients.clob.rewards.getMarket({
                condition_id: required(conditionId, "conditionId", "polymarket_get_market_rewards"),
            });

            return JSON.stringify(rewards);
        },
        {
            name:        "polymarket_get_market_rewards",
            description: "Get the liquidity-provision reward programme for a market, if it has one.",
            schema: z.object({
                conditionId: conditionIdParam,
            }),
        },
    );

    const getOpenInterest = tool(
        async ({ conditionId }) => {
            const market = Polymarket.Data.Common.ConditionId.parse(
                required(conditionId, "conditionId", "polymarket_get_open_interest"),
            );

            return JSON.stringify(await clients.data.markets.getOpenInterest({ market: [market] }));
        },
        {
            name:        "polymarket_get_open_interest",
            description: "Get the total value of positions currently open in a market — how much money is riding on it right now.",
            schema: z.object({
                conditionId: conditionIdParam,
            }),
        },
    );

    const getLiveVolume = tool(
        async ({ eventId }) => {
            const id = wholeNumber(
                required(eventId, "eventId", "polymarket_get_live_volume"),
                "eventId",
                "polymarket_get_live_volume",
            );

            return JSON.stringify(await clients.data.markets.getLiveVolume({ id }));
        },
        {
            name:        "polymarket_get_live_volume",
            description: "Get current trading volume for an event. Takes an event id — not a market conditionId — from polymarket_list_events or polymarket_get_event.",
            schema: z.object({
                eventId: z.string().describe("Numeric event id, from an event returned by polymarket_list_events or polymarket_get_event."),
            }),
        },
    );


    return [
        searchMarkets,
        searchAll,

        listMarketsTool,
        getMarket,
        listEventsTool,
        getEvent,

        listTags,
        getTag,
        listSeries,
        getSeries,
        listSports,
        listTeams,

        listComments,
        listTrades,
        listHolders,

        getPrice,
        getOrderBook,
        getPriceHistory,
        getMarketMechanics,

        getMarketConfig,
        getMarketRewards,
        getOpenInterest,
        getLiveVolume,
    ];
}
