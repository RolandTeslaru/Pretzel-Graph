"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const tools_1 = require("@langchain/core/tools");
const v3_1 = require("zod/v3");
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const fetch_1 = require("./fetch");
class Node extends node_sdk_1.RuntimeNode {
    client;
    constructor(nodeId, context) {
        super(nodeId, context);
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.massiveApi.blob);
        this.client = (0, fetch_1.createMassiveClient)(this.httpClientFactory, (0, fetch_1.requireMassiveApiKey)(apiKey));
    }
    async onRun() {
        const fields = this.fieldValues;
        if (fields.isConvertedToTool === true)
            return {
                tools: this.buildTools(fields),
            };
        if (fields.action === "marketStatus")
            return {
                data: await (0, fetch_1.fetchMarketStatus)(this.client),
            };
        const ticker = (0, fetch_1.normalizeTicker)(fields.ticker);
        if (!ticker)
            throw new Error("Massive Market: 'ticker' input is required (e.g. AAPL, MSFT).");
        switch (fields.action) {
            case "snapshot":
                return {
                    data: await (0, fetch_1.fetchSnapshot)(this.client, ticker),
                };
            case "details":
                return {
                    data: await (0, fetch_1.fetchTickerDetails)(this.client, ticker),
                };
            case "financials":
                return {
                    data: await (0, fetch_1.fetchFinancials)(this.client, {
                        ticker,
                        timeframe: fields.timeframe,
                        limit: fields.limit,
                    }),
                };
            case "candles": {
                const candles = await (0, fetch_1.fetchAggs)(this.client, {
                    ticker,
                    multiplier: fields.multiplier,
                    timespan: fields.timespan,
                    lookbackHours: fields.lookbackHours,
                    adjusted: fields.adjusted,
                });
                return {
                    candles,
                    summary: (0, fetch_1.summarizeAggs)(ticker, fields.timespan, fields.multiplier, candles),
                };
            }
        }
    }
    buildTools(defaults) {
        const defaultTimespan = defaults.timespan;
        const defaultMultiplier = defaults.multiplier;
        const defaultLookback = defaults.lookbackHours;
        const adjusted = defaults.adjusted;
        const getCandles = (0, tools_1.tool)(async ({ ticker, timespan, multiplier, lookbackHours }) => {
            const normalizedTicker = (0, fetch_1.normalizeTicker)(ticker);
            const candles = await (0, fetch_1.fetchAggs)(this.client, {
                ticker: normalizedTicker,
                timespan: timespan ?? defaultTimespan,
                multiplier: multiplier ?? defaultMultiplier,
                lookbackHours: lookbackHours ?? defaultLookback,
                adjusted,
            });
            const summary = (0, fetch_1.summarizeAggs)(normalizedTicker, timespan ?? defaultTimespan, multiplier ?? defaultMultiplier, candles);
            return JSON.stringify({ candles, summary });
        }, {
            name: "massive_get_candles",
            description: "Download OHLCV aggregates (bars) from Massive for a US stock ticker. Returns a summary (count, first/last close, change, change %).",
            schema: v3_1.z.object({
                ticker: v3_1.z.string().describe("US stock ticker, e.g. AAPL, MSFT, TSLA."),
                timespan: v3_1.z.enum(["minute", "hour", "day"]).optional().describe("Candle timespan. Defaults to the node's configured timespan."),
                multiplier: v3_1.z.number().int().min(1).max(60).optional().describe("Candle multiplier. Defaults to the node's configured multiplier."),
                lookbackHours: v3_1.z.number().int().min(1).max(24 * 365).optional().describe("How far back to fetch, in hours. Defaults to the node's configured lookback."),
            }),
        });
        const getSnapshot = (0, tools_1.tool)(async ({ ticker }) => {
            const normalizedTicker = (0, fetch_1.normalizeTicker)(ticker);
            try {
                const snapshot = await (0, fetch_1.fetchSnapshot)(this.client, normalizedTicker);
                return JSON.stringify(snapshot);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return JSON.stringify({ error: message, upgradeUrl: "https://massive.com/pricing" });
            }
        }, {
            name: "massive_get_snapshot",
            description: "Get a Massive snapshot for a US stock ticker (often includes last trade/quote and day metrics).",
            schema: v3_1.z.object({
                ticker: v3_1.z.string().describe("US stock ticker, e.g. AAPL."),
            }),
        });
        const getNews = (0, tools_1.tool)(async ({ ticker, limit, publishedAfter, publishedBefore, compact }) => {
            const normalizedTicker = ticker ? (0, fetch_1.normalizeTicker)(ticker) : undefined;
            const data = await (0, fetch_1.fetchNews)(this.client, {
                ticker: normalizedTicker,
                limit: limit ?? 10,
                publishedAfter,
                publishedBefore,
                order: "desc",
            });
            if (compact === false)
                return JSON.stringify(data);
            return JSON.stringify((0, fetch_1.compactNews)(data));
        }, {
            name: "massive_get_news",
            description: "Get recent news articles for a US stock ticker from Massive reference data. Returns compact article objects by default to avoid huge outputs.",
            schema: v3_1.z.object({
                ticker: v3_1.z.string().optional().describe("US stock ticker, e.g. AAPL. If omitted, returns general recent market news (if supported)."),
                limit: v3_1.z.number().int().min(1).max(50).optional().describe("Max results to return. Defaults to 10."),
                publishedAfter: v3_1.z.string().optional().describe("ISO datetime lower bound (UTC), e.g. 2026-05-01T00:00:00Z"),
                publishedBefore: v3_1.z.string().optional().describe("ISO datetime upper bound (UTC), e.g. 2026-05-03T00:00:00Z"),
                compact: v3_1.z.boolean().optional().describe("If true/omitted, returns a compact shape. If false, returns raw API response."),
            }),
        });
        const getLastTrade = (0, tools_1.tool)(async ({ ticker }) => {
            const normalizedTicker = (0, fetch_1.normalizeTicker)(ticker);
            try {
                const trade = await (0, fetch_1.fetchLastTrade)(this.client, normalizedTicker);
                return JSON.stringify(trade);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return JSON.stringify({ error: message, upgradeUrl: "https://massive.com/pricing" });
            }
        }, {
            name: "massive_get_last_trade",
            description: "Get the most recent trade for a US stock ticker from Massive.",
            schema: v3_1.z.object({
                ticker: v3_1.z.string().describe("US stock ticker, e.g. AAPL."),
            }),
        });
        const getLastQuote = (0, tools_1.tool)(async ({ ticker }) => {
            const normalizedTicker = (0, fetch_1.normalizeTicker)(ticker);
            try {
                const quote = await (0, fetch_1.fetchLastQuote)(this.client, normalizedTicker);
                return JSON.stringify(quote);
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return JSON.stringify({ error: message, upgradeUrl: "https://massive.com/pricing" });
            }
        }, {
            name: "massive_get_last_quote",
            description: "Get the most recent NBBO quote for a US stock ticker from Massive.",
            schema: v3_1.z.object({
                ticker: v3_1.z.string().describe("US stock ticker, e.g. AAPL."),
            }),
        });
        const getTickerDetails = (0, tools_1.tool)(async ({ ticker }) => {
            const normalizedTicker = (0, fetch_1.normalizeTicker)(ticker);
            const details = await (0, fetch_1.fetchTickerDetails)(this.client, normalizedTicker);
            return JSON.stringify(details);
        }, {
            name: "massive_get_ticker_details",
            description: "Get reference metadata for a US stock ticker (company name, exchange, type, etc.).",
            schema: v3_1.z.object({
                ticker: v3_1.z.string().describe("US stock ticker, e.g. AAPL."),
            }),
        });
        const searchTickersTool = (0, tools_1.tool)(async ({ query, limit }) => {
            const q = (query ?? "").trim();
            if (!q)
                throw new Error("massive_search_tickers: 'query' is required.");
            const results = await (0, fetch_1.searchTickers)(this.client, q, limit ?? 10);
            return JSON.stringify(results);
        }, {
            name: "massive_search_tickers",
            description: "Search US stock tickers by symbol or company name using Massive reference data. Useful when you only know the company name.",
            schema: v3_1.z.object({
                query: v3_1.z.string().describe("Search string (symbol or company name), e.g. 'apple' or 'AAPL'."),
                limit: v3_1.z.number().int().min(1).max(50).optional().describe("Max results to return. Defaults to 10."),
            }),
        });
        const getFinancials = (0, tools_1.tool)(async ({ ticker, timeframe, limit }) => {
            const results = await (0, fetch_1.fetchFinancials)(this.client, {
                ticker: (0, fetch_1.normalizeTicker)(ticker),
                timeframe: timeframe ?? "quarterly",
                limit: limit ?? 4,
            });
            return JSON.stringify({ count: results.length, results });
        }, {
            name: "massive_get_financials",
            description: "Get reported financial statements for a US stock ticker — income statement, balance sheet and cash flow, one entry per reporting period.",
            schema: v3_1.z.object({
                ticker: v3_1.z.string().describe("US stock ticker, e.g. AAPL."),
                timeframe: v3_1.z.enum(["annual", "quarterly"]).optional().describe("Reporting period. Defaults to quarterly."),
                limit: v3_1.z.number().int().min(1).max(100).optional().describe("How many periods to return. Defaults to 4."),
            }),
        });
        const getMarketStatus = (0, tools_1.tool)(async () => JSON.stringify(await (0, fetch_1.fetchMarketStatus)(this.client)), {
            name: "massive_get_market_status",
            description: "Check whether US markets are currently open, including after-hours and per-exchange status. Use this before treating stale prices as a signal.",
            schema: v3_1.z.object({}),
        });
        return [
            getCandles,
            getNews,
            getSnapshot,
            getLastTrade,
            getLastQuote,
            getTickerDetails,
            searchTickersTool,
            getFinancials,
            getMarketStatus,
        ];
    }
}
exports.Node = Node;
