import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";

import {
    compactNews,
    createMassiveClient,
    fetchAggs,
    fetchLastQuote,
    fetchLastTrade,
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

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
        const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.massiveApi.blob);
        this.client = createMassiveClient(requireMassiveApiKey(apiKey));
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const ticker = normalizeTicker(incoming.ticker);
        if (!ticker)
            throw new Error("Massive Market: 'ticker' input is required (e.g. AAPL, MSFT).");

        const { timespan, multiplier, lookbackHours, adjusted } = this.fieldValues;

        const [candles, snapshot] = await Promise.all([
            fetchAggs(this.client, {
                ticker,
                multiplier,
                timespan: timespan as "minute" | "hour" | "day",
                lookbackHours,
                adjusted,
            }),
            fetchSnapshot(this.client, ticker).catch(() => null),
        ]);

        const summary = summarizeAggs(ticker, timespan, multiplier, candles);

        return { candles, summary, snapshot };
    }

    protected override async onBuildTool(
        incoming: InferIncoming<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        const { timespan: defaultTimespan, multiplier: defaultMultiplier, lookbackHours: defaultLookback, adjusted } = this.fieldValues;

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

        return { tools: [getCandles, getNews, getSnapshot, getLastTrade, getLastQuote, getTickerDetails, searchTickersTool] };
    }
}
