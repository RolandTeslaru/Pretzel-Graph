import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";

import {
    compactNews,
    createMassiveClient,
    fetchAggs,
    fetchFinancials,
    fetchLastQuote,
    fetchLastTrade,
    fetchMarketStatus,
    fetchNews,
    fetchSnapshot,
    fetchTickerDetails,
    normalizeTicker,
    requireMassiveApiKey,
    searchTickers,
    summarizeAggs,
} from "./fetch";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    private readonly client: ReturnType<typeof createMassiveClient>;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.massiveApi.blob);
        this.client = createMassiveClient(this.httpClientFactory, requireMassiveApiKey(apiKey));
    }

    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {

        // reconcile-added fields aren't in the inferred field values, so they're read via a cast.
        const fields = this.fieldValues as Record<string, any>;
        const action = (fields.action ?? "candles") as
            "candles" | "snapshot" | "details" | "financials" | "marketStatus";

        if (action === "marketStatus")
            return { data: await fetchMarketStatus(this.client) } as any;

        const ticker = normalizeTicker(this.fieldValues.ticker);

        if (!ticker)
            throw new Error("Massive Market: 'ticker' input is required (e.g. AAPL, MSFT).");

        switch (action) {

            case "snapshot":
                return { data: await fetchSnapshot(this.client, ticker) } as any;

            case "details":
                return { data: await fetchTickerDetails(this.client, ticker) } as any;

            case "financials":
                return {
                    data: await fetchFinancials(this.client, {
                        ticker,
                        timeframe: (fields.timeframe ?? "quarterly") as "annual" | "quarterly",
                        limit: fields.limit ?? 4,
                    }),
                } as any;

            case "candles":
            default: {
                const timespan = (fields.timespan ?? "minute") as "minute" | "hour" | "day";
                const multiplier = fields.multiplier ?? 1;

                const candles = await fetchAggs(this.client, {
                    ticker,
                    multiplier,
                    timespan,
                    lookbackHours: fields.lookbackHours ?? 24,
                    adjusted: fields.adjusted ?? true,
                });

                return { candles, summary: summarizeAggs(ticker, timespan, multiplier, candles) } as any;
            }
        }
    }

    protected override async onBuildTool(
        incoming: InferIncoming<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        // These live on ToolBlueprint, which isn't what `fieldValues` is typed from.
        const toolFields = this.fieldValues as Record<string, any>;

        const defaultTimespan   = (toolFields.timespan ?? "minute") as "minute" | "hour" | "day";
        const defaultMultiplier = toolFields.multiplier ?? 1;
        const defaultLookback   = toolFields.lookbackHours ?? 24;
        const adjusted          = toolFields.adjusted ?? true;

        const getCandles = tool(
            async ({ ticker, timespan, multiplier, lookbackHours }) => {
                const normalizedTicker = normalizeTicker(ticker);
                const candles = await fetchAggs(this.client, {
                    ticker: normalizedTicker,
                    timespan: (timespan ?? defaultTimespan) as "minute" | "hour" | "day",
                    multiplier: multiplier ?? defaultMultiplier,
                    lookbackHours: lookbackHours ?? defaultLookback,
                    adjusted,
                });
                const summary = summarizeAggs(
                    normalizedTicker,
                    timespan ?? defaultTimespan,
                    multiplier ?? defaultMultiplier,
                    candles,
                );
                return JSON.stringify({ candles, summary });
            },
            {
                name: "massive_get_candles",
                description: "Download OHLCV aggregates (bars) from Massive for a US stock ticker. Returns a summary (count, first/last close, change, change %).",
                schema: z.object({
                    ticker: z.string().describe("US stock ticker, e.g. AAPL, MSFT, TSLA."),
                    timespan: z.enum(["minute", "hour", "day"]).optional().describe("Candle timespan. Defaults to the node's configured timespan."),
                    multiplier: z.number().int().min(1).max(60).optional().describe("Candle multiplier. Defaults to the node's configured multiplier."),
                    lookbackHours: z.number().int().min(1).max(24 * 365).optional().describe("How far back to fetch, in hours. Defaults to the node's configured lookback."),
                }),
            },
        );

        const getSnapshot = tool(
            async ({ ticker }) => {
                const normalizedTicker = normalizeTicker(ticker);
                try {
                    const snapshot = await fetchSnapshot(this.client, normalizedTicker);
                    return JSON.stringify(snapshot);
                }
                catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    return JSON.stringify({ error: message, upgradeUrl: "https://massive.com/pricing" });
                }
            },
            {
                name: "massive_get_snapshot",
                description: "Get a Massive snapshot for a US stock ticker (often includes last trade/quote and day metrics).",
                schema: z.object({
                    ticker: z.string().describe("US stock ticker, e.g. AAPL."),
                }),
            },
        );

        const getNews = tool(
            async ({ ticker, limit, publishedAfter, publishedBefore, compact }) => {
                const normalizedTicker = ticker ? normalizeTicker(ticker) : undefined;
                const data = await fetchNews(this.client, {
                    ticker: normalizedTicker,
                    limit: limit ?? 10,
                    publishedAfter,
                    publishedBefore,
                    order: "desc",
                });

                if (compact === false)
                    return JSON.stringify(data);

                return JSON.stringify(compactNews(data));
            },
            {
                name: "massive_get_news",
                description: "Get recent news articles for a US stock ticker from Massive reference data. Returns compact article objects by default to avoid huge outputs.",
                schema: z.object({
                    ticker: z.string().optional().describe("US stock ticker, e.g. AAPL. If omitted, returns general recent market news (if supported)."),
                    limit: z.number().int().min(1).max(50).optional().describe("Max results to return. Defaults to 10."),
                    publishedAfter: z.string().optional().describe("ISO datetime lower bound (UTC), e.g. 2026-05-01T00:00:00Z"),
                    publishedBefore: z.string().optional().describe("ISO datetime upper bound (UTC), e.g. 2026-05-03T00:00:00Z"),
                    compact: z.boolean().optional().describe("If true/omitted, returns a compact shape. If false, returns raw API response."),
                }),
            },
        );

        const getLastTrade = tool(
            async ({ ticker }) => {
                const normalizedTicker = normalizeTicker(ticker);
                try {
                    const trade = await fetchLastTrade(this.client, normalizedTicker);
                    return JSON.stringify(trade);
                }
                catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    return JSON.stringify({ error: message, upgradeUrl: "https://massive.com/pricing" });
                }
            },
            {
                name: "massive_get_last_trade",
                description: "Get the most recent trade for a US stock ticker from Massive.",
                schema: z.object({
                    ticker: z.string().describe("US stock ticker, e.g. AAPL."),
                }),
            },
        );

        const getLastQuote = tool(
            async ({ ticker }) => {
                const normalizedTicker = normalizeTicker(ticker);
                try {
                    const quote = await fetchLastQuote(this.client, normalizedTicker);
                    return JSON.stringify(quote);
                }
                catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    return JSON.stringify({ error: message, upgradeUrl: "https://massive.com/pricing" });
                }
            },
            {
                name: "massive_get_last_quote",
                description: "Get the most recent NBBO quote for a US stock ticker from Massive.",
                schema: z.object({
                    ticker: z.string().describe("US stock ticker, e.g. AAPL."),
                }),
            },
        );

        const getTickerDetails = tool(
            async ({ ticker }) => {
                const normalizedTicker = normalizeTicker(ticker);
                const details = await fetchTickerDetails(this.client, normalizedTicker);
                return JSON.stringify(details);
            },
            {
                name: "massive_get_ticker_details",
                description: "Get reference metadata for a US stock ticker (company name, exchange, type, etc.).",
                schema: z.object({
                    ticker: z.string().describe("US stock ticker, e.g. AAPL."),
                }),
            },
        );

        const searchTickersTool = tool(
            async ({ query, limit }) => {
                const q = (query ?? "").trim();
                if (!q)
                    throw new Error("massive_search_tickers: 'query' is required.");
                const results = await searchTickers(this.client, q, limit ?? 10);
                return JSON.stringify(results);
            },
            {
                name: "massive_search_tickers",
                description: "Search US stock tickers by symbol or company name using Massive reference data. Useful when you only know the company name.",
                schema: z.object({
                    query: z.string().describe("Search string (symbol or company name), e.g. 'apple' or 'AAPL'."),
                    limit: z.number().int().min(1).max(50).optional().describe("Max results to return. Defaults to 10."),
                }),
            },
        );

        const getFinancials = tool(
            async ({ ticker, timeframe, limit }) => {
                const results = await fetchFinancials(this.client, {
                    ticker: normalizeTicker(ticker),
                    timeframe: (timeframe ?? "quarterly") as "annual" | "quarterly",
                    limit: limit ?? 4,
                });
                return JSON.stringify({ count: results.length, results });
            },
            {
                name: "massive_get_financials",
                description: "Get reported financial statements for a US stock ticker — income statement, balance sheet and cash flow, one entry per reporting period.",
                schema: z.object({
                    ticker: z.string().describe("US stock ticker, e.g. AAPL."),
                    timeframe: z.enum(["annual", "quarterly"]).optional().describe("Reporting period. Defaults to quarterly."),
                    limit: z.number().int().min(1).max(100).optional().describe("How many periods to return. Defaults to 4."),
                }),
            },
        );

        const getMarketStatus = tool(
            async () => JSON.stringify(await fetchMarketStatus(this.client)),
            {
                name: "massive_get_market_status",
                description: "Check whether US markets are currently open, including after-hours and per-exchange status. Use this before treating stale prices as a signal.",
                schema: z.object({}),
            },
        );

        return { tools: [getCandles, getNews, getSnapshot, getLastTrade, getLastQuote, getTickerDetails, searchTickersTool, getFinancials, getMarketStatus] };
    }
}
