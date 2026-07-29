import { tool } from "@langchain/core/tools"
import { ToolBudget } from "@pretzel-graph/node-sdk"
import { z } from "zod/v3"

import type { KalshiPublicSDK } from "../sdk"


const marketStatus = z.enum(["unopened", "open", "paused", "closed", "settled"])
    .default("open")
    .describe("Kalshi market lifecycle collection to browse.")

const eventStatus = z.enum(["unopened", "open", "closed", "settled", "all"])
    .default("open")
    .describe("Kalshi event lifecycle collection to browse.")

const limit = (fallback: number) => z.number().int().min(1).max(1_000)
    .default(fallback)
    .describe("Maximum records to return.")

const marketTicker = z.string()
    .describe("Exact Kalshi market ticker returned by a market or event result.")


export function buildTools(kalshi: KalshiPublicSDK) {

    const listMarkets = tool(
        async ({ status, eventTicker, seriesTicker, limit }) =>
            ToolBudget.list("markets", await kalshi.markets.list({
                status,
                eventTicker,
                seriesTicker,
                limit,
            }), { hint: "Narrow by event or series ticker, or lower the limit." }),
        {
            name:        "kalshi_list_markets",
            description: "Browse Kalshi markets by their API lifecycle status. Results include exact market and event tickers, YES/NO labels and prices, volume and open interest. Settled results transparently include Kalshi's historical partition.",
            schema: z.object({
                status:       marketStatus,
                eventTicker:  z.string().optional().describe("Limit to one event ticker."),
                seriesTicker: z.string().optional().describe("Limit to one recurring series ticker."),
                limit:        limit(20),
            }),
        },
    )


    const getMarket = tool(
        async ({ ticker }) =>
            ToolBudget.value(await kalshi.markets.get(ticker)),
        {
            name:        "kalshi_get_market",
            description: "Get one Kalshi market by its exact ticker, including lifecycle, prices, volume, settlement rules, valid price ranges and whether it came from the historical partition.",
            schema: z.object({ ticker: marketTicker }),
        },
    )


    const listEvents = tool(
        async ({ status, seriesTicker, includeMarkets, limit }) =>
            ToolBudget.list("events", await kalshi.events.list({
                status,
                seriesTicker,
                includeMarkets,
                limit,
            }), { hint: "Narrow by series ticker or lower the limit." }),
        {
            name:        "kalshi_list_events",
            description: "Browse Kalshi events. An event groups related markets and belongs to a recurring series. Include compact nested markets only when the contents of each event are needed.",
            schema: z.object({
                status:         eventStatus,
                seriesTicker:   z.string().optional().describe("Limit to one recurring series ticker."),
                includeMarkets: z.boolean().default(false).describe("Embed compact markets in every event."),
                limit:          limit(20),
            }),
        },
    )


    const getEvent = tool(
        async ({ ticker }) =>
            ToolBudget.value(await kalshi.events.get(ticker), {
                hint: "Use the market tickers in this result with market, order-book or history tools.",
            }),
        {
            name:        "kalshi_get_event",
            description: "Get one Kalshi event and its compact markets by exact event ticker.",
            schema: z.object({
                ticker: z.string().describe("Exact Kalshi event ticker returned by a market or event listing."),
            }),
        },
    )


    const listSeries = tool(
        async ({ category, tags, includeVolume, limit }) =>
            ToolBudget.list("series", await kalshi.series.list({
                category,
                tags,
                includeVolume,
                limit,
            }), { hint: "Narrow by category or tags, or lower the limit." }),
        {
            name:        "kalshi_list_series",
            description: "Browse Kalshi's recurring series—the top of the Series → Event → Market hierarchy—by category or tags.",
            schema: z.object({
                category:      z.string().optional().describe("Exact Kalshi category such as Politics or Sports."),
                tags:          z.array(z.string()).optional().describe("Tags that the series should match."),
                includeVolume: z.boolean().default(true).describe("Ask Kalshi to include aggregate series volume."),
                limit:         limit(20),
            }),
        },
    )


    const getSeries = tool(
        async ({ ticker }) =>
            ToolBudget.value(await kalshi.series.get(ticker)),
        {
            name:        "kalshi_get_series",
            description: "Get one Kalshi series by ticker, including its category, schedule, settlement sources, contract documents and fee configuration.",
            schema: z.object({
                ticker: z.string().describe("Exact Kalshi series ticker returned by an event or series listing."),
            }),
        },
    )


    const listTrades = tool(
        async ({ ticker, includeHistorical, blockTradesOnly, limit }) =>
            ToolBudget.list("trades", await kalshi.trades.list({
                ticker,
                includeHistorical,
                blockTradesOnly,
                limit,
            }), { hint: "Filter by market ticker or lower the limit." }),
        {
            name:        "kalshi_list_trades",
            description: "List public Kalshi fills with fixed-point prices and quantities and canonical taker outcome/book direction. Historical data can be merged into the result.",
            schema: z.object({
                ticker:            z.string().optional().describe("Limit to one exact market ticker."),
                includeHistorical: z.boolean().default(false).describe("Also query Kalshi's archived trade partition."),
                blockTradesOnly:   z.boolean().default(false).describe("Return only negotiated block trades."),
                limit:             limit(100),
            }),
        },
    )


    const getOrderBook = tool(
        async ({ ticker, depth }) =>
            ToolBudget.value(await kalshi.prices.orderBook({ ticker, depth })),
        {
            name:        "kalshi_get_order_book",
            description: "Get a Kalshi market's order book. Kalshi transmits YES and NO bids; this result also derives their exact complementary asks and puts every side best-first.",
            schema: z.object({
                ticker: marketTicker,
                depth:  z.number().int().min(1).max(100).default(15)
                    .describe("Price levels per side."),
            }),
        },
    )


    const getPriceHistory = tool(
        async ({ ticker, window, interval, points }) =>
            ToolBudget.value(await kalshi.prices.history({
                ticker,
                window,
                interval,
                points,
            }), { hint: "Use a shorter window, coarser interval or fewer points." }),
        {
            name:        "kalshi_get_price_history",
            description: "Get fixed-point Kalshi candlesticks for one market. The service automatically chooses the live or historical collection and returns a sampled, identified series.",
            schema: z.object({
                ticker: marketTicker,
                window: z.enum(["1d", "7d", "30d", "90d", "1y", "max"]).default("30d"),
                interval: z.union([z.literal(1), z.literal(60), z.literal(1440)])
                    .default(60)
                    .describe("Candlestick interval in minutes: 1, 60, or 1440."),
                points: z.number().int().min(2).max(500).default(120)
                    .describe("Maximum sampled points to return."),
            }),
        },
    )


    const getExchangeStatus = tool(
        async () =>
            ToolBudget.value(await kalshi.exchange.status()),
        {
            name:        "kalshi_get_exchange_status",
            description: "Check whether the Kalshi exchange, trading and intra-exchange transfers are currently active.",
            schema: z.object({}),
        },
    )


    return [
        listMarkets,
        getMarket,
        listEvents,
        getEvent,
        listSeries,
        getSeries,
        listTrades,
        getOrderBook,
        getPriceHistory,
        getExchangeStatus,
    ]
}
