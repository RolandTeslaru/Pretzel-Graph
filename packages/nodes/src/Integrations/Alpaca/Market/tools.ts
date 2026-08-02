import { tool } from "@langchain/core/tools"
import { ToolBudget } from "@pretzel-graph/node-sdk"
import { z } from "zod/v3"

import type { AlpacaMarketService } from "../services"


const assetClass = z.enum(["stock", "crypto", "option"])
    .describe("Alpaca asset family. Option symbols use OCC format.")

const symbol = z.string()
    .describe("Exact symbol, e.g. AAPL, BTC/USD, or AAPL260116C00200000.")

const stockFeed = z.enum(["iex", "sip", "otc", "boats"])
    .default("iex")
    .describe("US stock feed. IEX is the basic-plan-safe default; SIP may require a subscription.")

const date = (description: string) => z.string().optional().describe(description)

const limit = (fallback: number, maximum: number) => z.number().int().min(1).max(maximum)
    .default(fallback)
    .describe("Maximum records returned.")


export function buildTools(market: AlpacaMarketService) {

    const listAssets = tool(
        async ({ query, status, assetClass, exchange, limit }) =>
            ToolBudget.list("assets", await market.assets.list({
                query,
                status,
                assetClass: assetClass === "all" ? undefined : assetClass,
                exchange,
                limit,
            }), { hint: "Narrow by search text, asset class or exchange." }),
        {
            name:        "alpaca_market_list_assets",
            description: "Search Alpaca's instrument catalogue by symbol or name and inspect whether assets are active, tradable, fractionable, marginable or shortable.",
            schema: z.object({
                query:      z.string().optional().describe("Symbol or name substring."),
                status:     z.enum(["active", "inactive"]).default("active"),
                assetClass: z.enum(["all", "us_equity", "crypto", "us_option"]).default("us_equity"),
                exchange:   z.string().optional().describe("Optional exact exchange code."),
                limit:      limit(20, 1_000),
            }),
        },
    )


    const getAsset = tool(
        async ({ symbolOrId }) => ToolBudget.value(await market.assets.get(symbolOrId)),
        {
            name:        "alpaca_market_get_asset",
            description: "Get one Alpaca asset by its exact symbol or asset id, including trading capabilities.",
            schema: z.object({
                symbolOrId: z.string().describe("Exact asset symbol or UUID."),
            }),
        },
    )


    const getClock = tool(
        async () => ToolBudget.value(await market.clock()),
        {
            name:        "alpaca_market_clock",
            description: "Get the current US market clock, open state, next open and next close.",
            schema:      z.object({}),
        },
    )


    const getCalendar = tool(
        async ({ start, end, limit }) =>
            ToolBudget.list("calendar", await market.calendar({ start, end, limit }), {
                hint: "Use a narrower date range when only a few sessions are needed.",
            }),
        {
            name:        "alpaca_market_calendar",
            description: "List US trading days with regular and extended session times.",
            schema: z.object({
                start: date("Optional ISO start date."),
                end:   date("Optional ISO end date."),
                limit: limit(30, 1_000),
            }),
        },
    )


    const getBars = tool(
        async ({ assetClass, symbol, timeframe, multiplier, start, end, limit, feed }) =>
            ToolBudget.list("bars", await market.bars({
                assetClass,
                symbol,
                unit: timeframe,
                multiplier,
                start,
                end,
                limit,
                feed,
            }), { hint: "Use a larger timeframe, tighter date range or smaller limit." }),
        {
            name:        "alpaca_market_bars",
            description: "Get bounded, auto-paginated historical OHLCV bars for a stock, crypto pair or option contract.",
            schema: z.object({
                assetClass,
                symbol,
                timeframe: z.enum(["minute", "hour", "day", "week", "month"]).default("hour"),
                multiplier: z.number().int().min(1).max(59).default(1),
                start:      date("Optional ISO start datetime."),
                end:        date("Optional ISO end datetime."),
                limit:      limit(200, 5_000),
                feed:       stockFeed,
            }),
        },
    )


    const getTrades = tool(
        async ({ assetClass, symbol, start, end, limit, feed }) =>
            ToolBudget.list("trades", await market.trades({
                assetClass,
                symbol,
                start,
                end,
                limit,
                feed,
            }), { hint: "Use a tighter date range or smaller limit." }),
        {
            name:        "alpaca_market_trades",
            description: "Get bounded historical trade prints for a stock, crypto pair or option contract.",
            schema: z.object({
                assetClass,
                symbol,
                start: date("Optional ISO start datetime."),
                end:   date("Optional ISO end datetime."),
                limit: limit(100, 1_000),
                feed:  stockFeed,
            }),
        },
    )


    const getQuotes = tool(
        async ({ assetClass, symbol, start, end, limit, feed }) =>
            ToolBudget.list("quotes", await market.quotes({
                assetClass,
                symbol,
                start,
                end,
                limit,
                feed,
            }), { hint: "Use a tighter date range or smaller limit." }),
        {
            name:        "alpaca_market_quotes",
            description: "Get bounded historical best-bid/best-ask quotes for a stock or crypto pair.",
            schema: z.object({
                assetClass: z.enum(["stock", "crypto"]),
                symbol,
                start: date("Optional ISO start datetime."),
                end:   date("Optional ISO end datetime."),
                limit: limit(100, 1_000),
                feed:  stockFeed,
            }),
        },
    )


    const getSnapshot = tool(
        async ({ assetClass, symbol, feed }) =>
            ToolBudget.value(await market.snapshot({ assetClass, symbol, feed })),
        {
            name:        "alpaca_market_snapshot",
            description: "Get the latest trade, quote, minute bar, daily bar and prior daily bar for one stock or crypto pair.",
            schema: z.object({
                assetClass: z.enum(["stock", "crypto"]),
                symbol,
                feed: stockFeed,
            }),
        },
    )


    const getNews = tool(
        async ({ symbols, start, end, limit }) =>
            ToolBudget.list("news", await market.news({ symbols, start, end, limit }), {
                hint: "Filter by symbols or lower the limit.",
            }),
        {
            name:        "alpaca_market_news",
            description: "Get recent Alpaca news across stocks and crypto, optionally filtered by symbols and time.",
            schema: z.object({
                symbols: z.array(z.string()).optional().describe("Optional symbols such as AAPL or BTC/USD."),
                start:   date("Optional ISO start datetime."),
                end:     date("Optional ISO end datetime."),
                limit:   limit(10, 100),
            }),
        },
    )


    const listOptionContracts = tool(
        async ({ underlyingSymbols, status, type, expirationDate, expirationFrom, expirationTo, strikeFrom, strikeTo, limit }) =>
            ToolBudget.list("contracts", await market.optionContracts.list({
                underlyingSymbols,
                status,
                type: type === "all" ? undefined : type,
                expirationDate,
                expirationFrom,
                expirationTo,
                strikeFrom,
                strikeTo,
                limit,
            }), { hint: "Narrow by underlying, expiry, type or strike range." }),
        {
            name:        "alpaca_market_list_option_contracts",
            description: "Browse tradable Alpaca option contracts and their exact OCC symbols, strikes and expirations.",
            schema: z.object({
                underlyingSymbols: z.array(z.string()).optional(),
                status:            z.enum(["active", "inactive"]).default("active"),
                type:              z.enum(["all", "call", "put"]).default("all"),
                expirationDate:    date("Exact expiration date."),
                expirationFrom:    date("Minimum expiration date."),
                expirationTo:      date("Maximum expiration date."),
                strikeFrom:        z.number().nonnegative().optional(),
                strikeTo:          z.number().nonnegative().optional(),
                limit:             limit(50, 1_000),
            }),
        },
    )


    const getOptionContract = tool(
        async ({ symbolOrId }) => ToolBudget.value(await market.optionContracts.get(symbolOrId)),
        {
            name:        "alpaca_market_get_option_contract",
            description: "Get one option contract by exact OCC symbol or contract id.",
            schema: z.object({ symbolOrId: z.string() }),
        },
    )


    const getOptionChain = tool(
        async ({ underlyingSymbol, type, expirationDate, expirationFrom, expirationTo, strikeFrom, strikeTo, limit }) =>
            ToolBudget.list("chain", await market.optionChain({
                underlyingSymbol,
                type: type === "all" ? undefined : type,
                expirationDate,
                expirationFrom,
                expirationTo,
                strikeFrom,
                strikeTo,
                limit,
            }), { hint: "Narrow by expiry, type or strike range." }),
        {
            name:        "alpaca_market_option_chain",
            description: "Get a bounded option chain with latest trade, quote, bars, implied volatility and Greeks.",
            schema: z.object({
                underlyingSymbol: z.string().describe("Underlying stock symbol, e.g. AAPL."),
                type:             z.enum(["all", "call", "put"]).default("all"),
                expirationDate:   date("Exact expiration date."),
                expirationFrom:   date("Minimum expiration date."),
                expirationTo:     date("Maximum expiration date."),
                strikeFrom:       z.number().nonnegative().optional(),
                strikeTo:         z.number().nonnegative().optional(),
                limit:            limit(50, 500),
            }),
        },
    )


    const getMostActives = tool(
        async ({ by, limit }) => ToolBudget.value(await market.mostActives({ by, limit })),
        {
            name:        "alpaca_market_most_actives",
            description: "Rank the current day's most-active US stocks by volume or trade count.",
            schema: z.object({
                by:    z.enum(["volume", "trades"]).default("volume"),
                limit: limit(10, 100),
            }),
        },
    )


    const getMovers = tool(
        async ({ marketType, limit }) => ToolBudget.value(await market.movers({ marketType, limit })),
        {
            name:        "alpaca_market_movers",
            description: "Get the largest current gainers and losers for stocks or crypto.",
            schema: z.object({
                marketType: z.enum(["stocks", "crypto"]).default("stocks"),
                limit:      limit(10, 100),
            }),
        },
    )


    return [
        listAssets,
        getAsset,
        getClock,
        getCalendar,
        getBars,
        getTrades,
        getQuotes,
        getSnapshot,
        getNews,
        listOptionContracts,
        getOptionContract,
        getOptionChain,
        getMostActives,
        getMovers,
    ]
}
