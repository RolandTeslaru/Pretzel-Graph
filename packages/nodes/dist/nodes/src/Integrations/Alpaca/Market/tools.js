"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTools = buildTools;
const tools_1 = require("@langchain/core/tools");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const v3_1 = require("zod/v3");
const assetClass = v3_1.z.enum(["stock", "crypto", "option"])
    .describe("Alpaca asset family. Option symbols use OCC format.");
const symbol = v3_1.z.string()
    .describe("Exact symbol, e.g. AAPL, BTC/USD, or AAPL260116C00200000.");
const stockFeed = v3_1.z.enum(["iex", "sip", "otc", "boats"])
    .default("iex")
    .describe("US stock feed. IEX is the basic-plan-safe default; SIP may require a subscription.");
const date = (description) => v3_1.z.string().optional().describe(description);
const limit = (fallback, maximum) => v3_1.z.number().int().min(1).max(maximum)
    .default(fallback)
    .describe("Maximum records returned.");
function buildTools(market) {
    const listAssets = (0, tools_1.tool)(async ({ query, status, assetClass, exchange, limit }) => node_sdk_1.ToolBudget.list("assets", await market.assets.list({
        query,
        status,
        assetClass: assetClass === "all" ? undefined : assetClass,
        exchange,
        limit,
    }), { hint: "Narrow by search text, asset class or exchange." }), {
        name: "alpaca_market_list_assets",
        description: "Search Alpaca's instrument catalogue by symbol or name and inspect whether assets are active, tradable, fractionable, marginable or shortable.",
        schema: v3_1.z.object({
            query: v3_1.z.string().optional().describe("Symbol or name substring."),
            status: v3_1.z.enum(["active", "inactive"]).default("active"),
            assetClass: v3_1.z.enum(["all", "us_equity", "crypto", "us_option"]).default("us_equity"),
            exchange: v3_1.z.string().optional().describe("Optional exact exchange code."),
            limit: limit(20, 1_000),
        }),
    });
    const getAsset = (0, tools_1.tool)(async ({ symbolOrId }) => node_sdk_1.ToolBudget.value(await market.assets.get(symbolOrId)), {
        name: "alpaca_market_get_asset",
        description: "Get one Alpaca asset by its exact symbol or asset id, including trading capabilities.",
        schema: v3_1.z.object({
            symbolOrId: v3_1.z.string().describe("Exact asset symbol or UUID."),
        }),
    });
    const getClock = (0, tools_1.tool)(async () => node_sdk_1.ToolBudget.value(await market.clock()), {
        name: "alpaca_market_clock",
        description: "Get the current US market clock, open state, next open and next close.",
        schema: v3_1.z.object({}),
    });
    const getCalendar = (0, tools_1.tool)(async ({ start, end, limit }) => node_sdk_1.ToolBudget.list("calendar", await market.calendar({ start, end, limit }), {
        hint: "Use a narrower date range when only a few sessions are needed.",
    }), {
        name: "alpaca_market_calendar",
        description: "List US trading days with regular and extended session times.",
        schema: v3_1.z.object({
            start: date("Optional ISO start date."),
            end: date("Optional ISO end date."),
            limit: limit(30, 1_000),
        }),
    });
    const getBars = (0, tools_1.tool)(async ({ assetClass, symbol, timeframe, multiplier, start, end, limit, feed }) => node_sdk_1.ToolBudget.list("bars", await market.bars({
        assetClass,
        symbol,
        unit: timeframe,
        multiplier,
        start,
        end,
        limit,
        feed,
    }), { hint: "Use a larger timeframe, tighter date range or smaller limit." }), {
        name: "alpaca_market_bars",
        description: "Get bounded, auto-paginated historical OHLCV bars for a stock, crypto pair or option contract.",
        schema: v3_1.z.object({
            assetClass,
            symbol,
            timeframe: v3_1.z.enum(["minute", "hour", "day", "week", "month"]).default("hour"),
            multiplier: v3_1.z.number().int().min(1).max(59).default(1),
            start: date("Optional ISO start datetime."),
            end: date("Optional ISO end datetime."),
            limit: limit(200, 5_000),
            feed: stockFeed,
        }),
    });
    const getTrades = (0, tools_1.tool)(async ({ assetClass, symbol, start, end, limit, feed }) => node_sdk_1.ToolBudget.list("trades", await market.trades({
        assetClass,
        symbol,
        start,
        end,
        limit,
        feed,
    }), { hint: "Use a tighter date range or smaller limit." }), {
        name: "alpaca_market_trades",
        description: "Get bounded historical trade prints for a stock, crypto pair or option contract.",
        schema: v3_1.z.object({
            assetClass,
            symbol,
            start: date("Optional ISO start datetime."),
            end: date("Optional ISO end datetime."),
            limit: limit(100, 1_000),
            feed: stockFeed,
        }),
    });
    const getQuotes = (0, tools_1.tool)(async ({ assetClass, symbol, start, end, limit, feed }) => node_sdk_1.ToolBudget.list("quotes", await market.quotes({
        assetClass,
        symbol,
        start,
        end,
        limit,
        feed,
    }), { hint: "Use a tighter date range or smaller limit." }), {
        name: "alpaca_market_quotes",
        description: "Get bounded historical best-bid/best-ask quotes for a stock or crypto pair.",
        schema: v3_1.z.object({
            assetClass: v3_1.z.enum(["stock", "crypto"]),
            symbol,
            start: date("Optional ISO start datetime."),
            end: date("Optional ISO end datetime."),
            limit: limit(100, 1_000),
            feed: stockFeed,
        }),
    });
    const getSnapshot = (0, tools_1.tool)(async ({ assetClass, symbol, feed }) => node_sdk_1.ToolBudget.value(await market.snapshot({ assetClass, symbol, feed })), {
        name: "alpaca_market_snapshot",
        description: "Get the latest trade, quote, minute bar, daily bar and prior daily bar for one stock or crypto pair.",
        schema: v3_1.z.object({
            assetClass: v3_1.z.enum(["stock", "crypto"]),
            symbol,
            feed: stockFeed,
        }),
    });
    const getNews = (0, tools_1.tool)(async ({ symbols, start, end, limit }) => node_sdk_1.ToolBudget.list("news", await market.news({ symbols, start, end, limit }), {
        hint: "Filter by symbols or lower the limit.",
    }), {
        name: "alpaca_market_news",
        description: "Get recent Alpaca news across stocks and crypto, optionally filtered by symbols and time.",
        schema: v3_1.z.object({
            symbols: v3_1.z.array(v3_1.z.string()).optional().describe("Optional symbols such as AAPL or BTC/USD."),
            start: date("Optional ISO start datetime."),
            end: date("Optional ISO end datetime."),
            limit: limit(10, 100),
        }),
    });
    const listOptionContracts = (0, tools_1.tool)(async ({ underlyingSymbols, status, type, expirationDate, expirationFrom, expirationTo, strikeFrom, strikeTo, limit }) => node_sdk_1.ToolBudget.list("contracts", await market.optionContracts.list({
        underlyingSymbols,
        status,
        type: type === "all" ? undefined : type,
        expirationDate,
        expirationFrom,
        expirationTo,
        strikeFrom,
        strikeTo,
        limit,
    }), { hint: "Narrow by underlying, expiry, type or strike range." }), {
        name: "alpaca_market_list_option_contracts",
        description: "Browse tradable Alpaca option contracts and their exact OCC symbols, strikes and expirations.",
        schema: v3_1.z.object({
            underlyingSymbols: v3_1.z.array(v3_1.z.string()).optional(),
            status: v3_1.z.enum(["active", "inactive"]).default("active"),
            type: v3_1.z.enum(["all", "call", "put"]).default("all"),
            expirationDate: date("Exact expiration date."),
            expirationFrom: date("Minimum expiration date."),
            expirationTo: date("Maximum expiration date."),
            strikeFrom: v3_1.z.number().nonnegative().optional(),
            strikeTo: v3_1.z.number().nonnegative().optional(),
            limit: limit(50, 1_000),
        }),
    });
    const getOptionContract = (0, tools_1.tool)(async ({ symbolOrId }) => node_sdk_1.ToolBudget.value(await market.optionContracts.get(symbolOrId)), {
        name: "alpaca_market_get_option_contract",
        description: "Get one option contract by exact OCC symbol or contract id.",
        schema: v3_1.z.object({ symbolOrId: v3_1.z.string() }),
    });
    const getOptionChain = (0, tools_1.tool)(async ({ underlyingSymbol, type, expirationDate, expirationFrom, expirationTo, strikeFrom, strikeTo, limit }) => node_sdk_1.ToolBudget.list("chain", await market.optionChain({
        underlyingSymbol,
        type: type === "all" ? undefined : type,
        expirationDate,
        expirationFrom,
        expirationTo,
        strikeFrom,
        strikeTo,
        limit,
    }), { hint: "Narrow by expiry, type or strike range." }), {
        name: "alpaca_market_option_chain",
        description: "Get a bounded option chain with latest trade, quote, bars, implied volatility and Greeks.",
        schema: v3_1.z.object({
            underlyingSymbol: v3_1.z.string().describe("Underlying stock symbol, e.g. AAPL."),
            type: v3_1.z.enum(["all", "call", "put"]).default("all"),
            expirationDate: date("Exact expiration date."),
            expirationFrom: date("Minimum expiration date."),
            expirationTo: date("Maximum expiration date."),
            strikeFrom: v3_1.z.number().nonnegative().optional(),
            strikeTo: v3_1.z.number().nonnegative().optional(),
            limit: limit(50, 500),
        }),
    });
    const getMostActives = (0, tools_1.tool)(async ({ by, limit }) => node_sdk_1.ToolBudget.value(await market.mostActives({ by, limit })), {
        name: "alpaca_market_most_actives",
        description: "Rank the current day's most-active US stocks by volume or trade count.",
        schema: v3_1.z.object({
            by: v3_1.z.enum(["volume", "trades"]).default("volume"),
            limit: limit(10, 100),
        }),
    });
    const getMovers = (0, tools_1.tool)(async ({ marketType, limit }) => node_sdk_1.ToolBudget.value(await market.movers({ marketType, limit })), {
        name: "alpaca_market_movers",
        description: "Get the largest current gainers and losers for stocks or crypto.",
        schema: v3_1.z.object({
            marketType: v3_1.z.enum(["stocks", "crypto"]).default("stocks"),
            limit: limit(10, 100),
        }),
    });
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
    ];
}
