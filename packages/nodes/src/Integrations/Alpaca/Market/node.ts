import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";
import {
    AlpacaEnvironment,
    compactNews,
    createAlpacaDataClient,
    createAlpacaTradingClient,
    fetchBars,
    fetchLatestQuote,
    fetchLatestTrade,
    fetchNews,
    listAssets,
    normalizeSymbol,
    requireAlpacaCredentials,
    searchAssetsLocal,
    summarizeBars,
    toAlpacaTimeframe,
} from "./fetch";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    private readonly dataClient: ReturnType<typeof createAlpacaDataClient>;
    private readonly tradingClient: ReturnType<typeof createAlpacaTradingClient>;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);

        const { apiKeyId, apiSecret } = this.context.credentialsAPI.getDecryptedValue(this.credentials.alpacaApi.blob);
        const credentials = requireAlpacaCredentials(apiKeyId, apiSecret);
        this.dataClient = createAlpacaDataClient(this.httpClientFactory, credentials);
        this.tradingClient = createAlpacaTradingClient(this.httpClientFactory, this.fieldValues.environment as AlpacaEnvironment, credentials);
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const symbol = normalizeSymbol(incoming.symbol);
        if (!symbol)
            throw new Error("Alpaca Market: 'symbol' input is required (e.g. AAPL, MSFT).");

        const timeframe = toAlpacaTimeframe(this.fieldValues.timespan as any, this.fieldValues.multiplier);
        const limit = Math.min(Math.max(this.fieldValues.maxBars, 1), 5000);

        const [bars, newsData] = await Promise.all([
            fetchBars(this.dataClient, {
                symbol,
                timeframe,
                lookbackHours: this.fieldValues.lookbackHours,
                limit,
            }),
            fetchNews(this.dataClient, {
                symbol,
                limit: 10,
            }).catch(() => ({ news: [] })),
        ]);

        const summary = summarizeBars(symbol, timeframe, bars);
        const news = compactNews(newsData as any);

        return { bars, summary, news };
    }

    protected override async onBuildTool(
        incoming: InferIncoming<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        const defaultTimeframe = toAlpacaTimeframe(this.fieldValues.timespan as any, this.fieldValues.multiplier);
        const defaultLookbackHours = this.fieldValues.lookbackHours;
        const defaultMaxBars = this.fieldValues.maxBars;

        const getBars = tool(
            async ({ symbol, timespan, multiplier, lookbackHours, maxBars, includeBars }) => {
                const normalizedSymbol = normalizeSymbol(symbol);
                const timeframe = toAlpacaTimeframe(
                    (timespan ?? this.fieldValues.timespan) as any,
                    multiplier ?? this.fieldValues.multiplier,
                );

                const effectiveLookback = lookbackHours ?? defaultLookbackHours;
                const cap = Math.min(Math.max(maxBars ?? defaultMaxBars, 1), 5000);

                const bars = await fetchBars(this.dataClient, {
                    symbol: normalizedSymbol,
                    timeframe,
                    lookbackHours: effectiveLookback,
                    limit: cap,
                });

                const summary = summarizeBars(normalizedSymbol, timeframe, bars);
                const truncated = bars.length >= cap;

                if (includeBars === false)
                    return JSON.stringify({ summary, truncated, returnedBars: bars.length, maxBars: cap });

                return JSON.stringify({ bars, summary, truncated, returnedBars: bars.length, maxBars: cap });
            },
            {
                name: "alpaca_get_bars",
                description: "Fetch OHLCV bars for a US stock symbol from Alpaca. Use larger timeframe or maxBars to avoid huge outputs.",
                schema: z.object({
                    symbol: z.string().describe("US stock symbol, e.g. AAPL, MSFT."),
                    timespan: z.enum(["minute", "hour", "day"]).optional().describe("Timespan. Defaults to node fields."),
                    multiplier: z.number().int().min(1).max(60).optional().describe("Multiplier. Defaults to node fields."),
                    lookbackHours: z.number().int().min(1).max(24 * 365).optional().describe("How far back to fetch bars. Defaults to node fields."),
                    maxBars: z.number().int().min(1).max(5000).optional().describe("Safety cap on returned bars. Defaults to node fields."),
                    includeBars: z.boolean().optional().describe("If false, returns only summary + counts (default is true)."),
                }),
            },
        );

        const getLatestTrade = tool(
            async ({ symbol }) => {
                const normalizedSymbol = normalizeSymbol(symbol);
                const trade = await fetchLatestTrade(this.dataClient, normalizedSymbol);
                return JSON.stringify(trade);
            },
            {
                name: "alpaca_get_latest_trade",
                description: "Fetch the latest trade for a US stock symbol from Alpaca.",
                schema: z.object({
                    symbol: z.string().describe("US stock symbol, e.g. AAPL."),
                }),
            },
        );

        const getLatestQuote = tool(
            async ({ symbol }) => {
                const normalizedSymbol = normalizeSymbol(symbol);
                const quote = await fetchLatestQuote(this.dataClient, normalizedSymbol);
                return JSON.stringify(quote);
            },
            {
                name: "alpaca_get_latest_quote",
                description: "Fetch the latest quote for a US stock symbol from Alpaca.",
                schema: z.object({
                    symbol: z.string().describe("US stock symbol, e.g. AAPL."),
                }),
            },
        );

        const getNews = tool(
            async ({ symbol, limit, start, end, compact }) => {
                const normalizedSymbol = normalizeSymbol(symbol);
                const data = await fetchNews(this.dataClient, {
                    symbol: normalizedSymbol,
                    limit: limit ?? 10,
                    start,
                    end,
                });

                if (compact === false)
                    return JSON.stringify(data);

                return JSON.stringify(compactNews(data));
            },
            {
                name: "alpaca_get_news",
                description: "Fetch recent news for a US stock symbol from Alpaca. Returns compact results by default.",
                schema: z.object({
                    symbol: z.string().describe("US stock symbol, e.g. AAPL."),
                    limit: z.number().int().min(1).max(50).optional().describe("Max articles. Defaults to 10."),
                    start: z.string().optional().describe("ISO datetime lower bound (UTC)."),
                    end: z.string().optional().describe("ISO datetime upper bound (UTC)."),
                    compact: z.boolean().optional().describe("If true/omitted, returns compact shape. If false, returns raw response."),
                }),
            },
        );

        const searchAssets = tool(
            async ({ query, status, limit }) => {
                const q = (query ?? "").trim();
                if (!q)
                    throw new Error("alpaca_search_assets: 'query' is required.");

                const assets = await listAssets(this.tradingClient, (status ?? "active") as any);
                return JSON.stringify(searchAssetsLocal(assets, q, limit ?? 10));
            },
            {
                name: "alpaca_search_assets",
                description: "Search Alpaca assets by symbol/name substring (uses trading API assets list).",
                schema: z.object({
                    query: z.string().describe("Substring to search for, e.g. 'apple' or 'AAPL'."),
                    status: z.enum(["active", "inactive", "all"]).optional().describe("Asset status filter. Defaults to active."),
                    limit: z.number().int().min(1).max(50).optional().describe("Max results. Defaults to 10."),
                }),
            },
        );

        return { tools: [getBars, getLatestTrade, getLatestQuote, getNews, searchAssets] };
    }
}
