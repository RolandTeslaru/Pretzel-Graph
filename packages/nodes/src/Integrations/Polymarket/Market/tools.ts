import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { Polymarket } from "../domain";
import type { PolymarketPublicSDK } from "../sdk";


// Tool mode declares no node fields — every input is per-call intent, so defaults live in the
// schema rather than in the editor. The run-mode action/api/resource axes disappear entirely:
// which Polymarket service backs a tool is infrastructure, not something the agent chooses.
const statusParam = z.enum(["active", "closed", "all"]).default("active")
    .describe("Which markets to include.");

const limitParam = (maximum: number, fallback: number) =>
    z.number().int().min(1).max(maximum).default(fallback)
        .describe(`Maximum records to return (1-${maximum}).`);

const tokenIdParam = z.string()
    .describe("Token id for a single outcome, taken from the `id` of an entry in a market's `outcomes` array.");

const conditionIdParam = z.string()
    .describe("Market condition id (0x…), taken from a market's conditionId field.");


/**
 * A listed market as an agent needs it, which is less than a node needs.
 *
 * `slug` goes because it is the question again in hyphens — 99% of `question`'s length, addressing
 * nothing `id` doesn't already address. The flags go when they say nothing: a listing filtered to
 * active markets repeats `active: true, closed: false` on every row, and `resolutionStatus` is null
 * on 199 markets in 200. Absent means false or unknown.
 *
 * Run mode keeps all of it — a node passing markets to another node isn't paying for context.
 */
const listed = (market: Polymarket.Market.Meta) => ({
    ...market,
    slug:             undefined,
    active:           market.active === false ? false : undefined,
    closed:           market.closed || undefined,
    acceptingOrders:  market.acceptingOrders === false ? false : undefined,
    resolutionStatus: market.resolutionStatus ?? undefined,
    negRisk:          market.negRisk || undefined,
});


export function buildTools(polymarket: PolymarketPublicSDK) {

    const searchMarkets = tool(
        async ({ query, status, limit }) => {
            const markets = await polymarket.markets.search({ query, status, limit });

            return ToolBudget.list("markets", markets.map(listed), {
                hint: "Narrow the query or lower the limit.",
            });
        },
        {
            name:        "polymarket_search_markets",
            description: "Search markets by relevance, matching the whole phrase against Polymarket's own index — natural wording like '2028 presidential election' works better than a single keyword. Each market comes back with its conditionId and its outcomes, each carrying the price and the id that the pricing tools take.",
            schema: z.object({
                query:  z.string().optional().describe("What to search for, in natural wording. Omit to get the top markets by volume."),
                status: statusParam,
                limit:  limitParam(500, 20),
            }),
        },
    );

    const searchAll = tool(
        async ({ query, includeTags, includeProfiles, limit }) => {
            const results = await polymarket.search.all({ query, includeTags, includeProfiles, limit });

            // Events come back as Meta — with a marketCount rather than their markets, which on a
            // big election event would be 128 nested markets per hit.
            return ToolBudget.value(results, { hint: "Narrow the query or lower the limit." });
        },
        {
            name:        "polymarket_search_all",
            description: "Search across events, and optionally tags and public profiles, at once. Use when you don't yet know whether the subject is an event, a tag or a person. Each event comes back with a marketCount rather than its markets — call polymarket_get_event with the slug to see them, or polymarket_search_markets to search markets directly.",
            schema: z.object({
                query:           z.string().describe("Free-text search term."),
                includeTags:     z.boolean().default(false).describe("Also match tags."),
                includeProfiles: z.boolean().default(false).describe("Also match public user profiles."),
                limit:           limitParam(100, 20),
            }),
        },
    );


    const listMarketsTool = tool(
        async ({ status, limit }) => {
            const markets = await polymarket.markets.list({ status, limit });

            return ToolBudget.list("markets", markets.map(listed), { hint: "Lower the limit." });
        },
        {
            name:        "polymarket_list_markets",
            description: "List markets ordered by volume, highest first. Each market carries its conditionId and its outcomes, each with a price and the id the pricing tools take.",
            schema: z.object({
                status: statusParam,
                limit:  limitParam(500, 20),
            }),
        },
    );

    const getMarket = tool(
        async ({ identifier }) => {
            return ToolBudget.value(await polymarket.markets.get(identifier));
        },
        {
            name:        "polymarket_get_market",
            description: "Fetch one market in full: the question, the resolution rules, its conditionId, and each outcome with its price and id.",
            schema: z.object({
                identifier: z.string().describe("Numeric market id (e.g. 12345) or market slug (e.g. 'will-x-happen'). Either works."),
            }),
        },
    );

    const getMarketStats = tool(
        async ({ identifier, includeDescription }) => {
            const stats = await polymarket.markets.stats(identifier);

            return ToolBudget.value(includeDescription
                ? stats
                : { ...stats, description: undefined });
        },
        {
            name:        "polymarket_get_market_stats",
            description: "Get how one market is trading: volume and price change over the last hour, day, week, month and year, plus liquidity, best bid and ask, and how contested it is. Prefer this over polymarket_get_price_history when the question is whether a market is rising or falling — it answers in one small call instead of a series you have to read.",
            schema: z.object({
                identifier: z.string().describe("Numeric market id or market slug. Either works."),
                includeDescription: z.boolean().default(false)
                    .describe("Also return the resolution contract — what has to happen for Yes to pay. Several hundred words, so ask for it only when the exact resolution terms matter."),
            }),
        },
    );

    const listEventsTool = tool(
        async ({ status, limit }) => {
            const events = await polymarket.events.list({ status, limit });

            return ToolBudget.list("events", events, { hint: "Lower the limit." });
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
        async ({ identifier, minPrice, limit }) => {
            return ToolBudget.value(await polymarket.events.get(identifier, { minPrice, limit }), {
                hint: "Raise minPrice, or lower the limit.",
            });
        },
        {
            name:        "polymarket_get_event",
            description: "Fetch one event with the markets it groups, longest odds first, each with its conditionId, outcome prices and outcome ids. A large race carries dozens of markets trading near zero, so this returns only those above minPrice by default — activeMarketCount always reports how many exist and marketsShown how many came back. The event's numeric id is what polymarket_get_live_volume expects.",
            schema: z.object({
                identifier: z.string().describe("Numeric event id or event slug. Either works."),
                minPrice:   z.number().min(0).max(1).default(0.01)
                    .describe("Drop markets trading below this probability, 0-1. Set to 0 for the whole field, including no-hopers."),
                limit:      z.number().int().min(1).max(500).default(50)
                    .describe("Maximum markets to return, after ordering by price."),
            }),
        },
    );

    const getEventStats = tool(
        async ({ identifier }) => {
            return ToolBudget.value(await polymarket.events.stats(identifier));
        },
        {
            name:        "polymarket_get_event_stats",
            description: "Get how one event is trading, summed across every market inside it: volume over the last day, week, month and year, liquidity, total open interest, and how contested it is. Use this instead of polymarket_get_event when the question is about the event's size or activity rather than which market is leading.",
            schema: z.object({
                identifier: z.string().describe("Numeric event id or event slug. Either works."),
            }),
        },
    );


    const listTags = tool(
        async ({ limit }) => {
            const tags = await polymarket.tags.list(limit);

            return ToolBudget.list("tags", tags, { hint: "Lower the limit." });
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
            return ToolBudget.value(await polymarket.tags.get(identifier));
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
            const series = await polymarket.series.list({ slug, limit });

            return ToolBudget.list("series", series, { hint: "Filter by slug or lower the limit." });
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
            return ToolBudget.value(await polymarket.series.get(seriesId));
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
            return ToolBudget.list("sports", await polymarket.sports.list());
        },
        {
            name:        "polymarket_list_sports",
            description: "List the sports leagues that have markets (NBA, EPL, NFL, …). Takes no arguments.",
            schema: z.object({}),
        },
    );

    const listTeams = tool(
        async ({ name, limit }) => {
            const teams = await polymarket.sports.teams({ name, limit });

            return ToolBudget.list("teams", teams, { hint: "Filter by name or lower the limit." });
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


    const listTrades = tool(
        async ({ conditionId, side, limit }) => {
            const trades = await polymarket.trades.forMarket({
                conditionId,
                side: side === "all" ? undefined : side,
                limit,
            });

            return ToolBudget.list("trades", trades, { hint: "Lower the limit or filter by side." });
        },
        {
            name:        "polymarket_list_trades",
            description: "List recent executed trades for a market. Shows what actually filled, as opposed to the resting orders in polymarket_get_order_book.",
            schema: z.object({
                conditionId: conditionIdParam,
                side:        z.enum(["all", "BUY", "SELL"]).default("all").describe("Restrict to one side of the book."),
                limit:       limitParam(1_000, 100),
            }),
        },
    );

    const listHolders = tool(
        async ({ conditionId, limit }) => {
            return ToolBudget.value(await polymarket.holders.forMarket({ conditionId, limit }));
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
            return ToolBudget.value(await polymarket.prices.get({ tokenId, kind }));
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
        async ({ tokenId, depth }) => {
            return ToolBudget.value(await polymarket.prices.book({ tokenId, depth }));
        },
        {
            name:        "polymarket_get_order_book",
            description: "Snapshot the order book for one outcome token: the best bids and asks with their sizes, best first, plus the total size resting across every level. Use polymarket_get_price if you only need a single number.",
            schema: z.object({
                tokenId: tokenIdParam,
                depth:   z.number().int().min(1).max(50).default(15)
                    .describe("How many price levels to return per side, best first."),
            }),
        },
    );

    const getPriceHistory = tool(
        async ({ tokenId, interval, fidelity, points }) => {
            return ToolBudget.value(
                await polymarket.prices.history({ tokenId, interval, fidelity, points }));
        },
        {
            name:        "polymarket_get_price_history",
            description: "Get a time series of prices for one outcome token, for charting or trend questions. Answers with the market the token belongs to alongside the series, so check the returned question or groupItemTitle is the one you meant. Includes first, last, low, high and the change over the period, which is usually enough on its own.",
            schema: z.object({
                tokenId:  tokenIdParam,
                interval: z.enum(["1h", "6h", "1d", "1w", "max"]).default("1d").describe("How far back to go."),
                fidelity: z.number().int().min(1).default(60).describe("Resolution in minutes between points."),
                points:   z.number().int().min(2).max(200).default(60)
                    .describe("How many readings to return, sampled evenly across the period. The true total is reported as `readings`."),
            }),
        },
    );

    const getMarketMechanics = tool(
        async ({ tokenId }) => {
            return ToolBudget.value(await polymarket.prices.mechanics(tokenId));
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
            return ToolBudget.value(await polymarket.markets.config(conditionId));
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
            return ToolBudget.value(await polymarket.markets.rewards(conditionId));
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
            return ToolBudget.value(await polymarket.stats.openInterest(conditionId));
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
            return ToolBudget.value(await polymarket.stats.liveVolume(eventId));
        },
        {
            name:        "polymarket_get_live_volume",
            description: "Get current trading volume for an event. Takes an event id — not a market conditionId — from polymarket_list_events or polymarket_get_event.",
            schema: z.object({
                eventId: z.string().describe("Numeric event id, from an event returned by polymarket_list_events or polymarket_get_event."),
            }),
        },
    );


    return {
        discoveryTools: [
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
        ],

        exchangeTools: [
            getPrice,
            getOrderBook,
            getPriceHistory,
            getMarketMechanics,
            getMarketConfig,
            getMarketRewards,
        ],

        analyticsTools: [
            getMarketStats,
            getEventStats,
            listTrades,
            listHolders,
            getOpenInterest,
            getLiveVolume,
        ],
    };
}
