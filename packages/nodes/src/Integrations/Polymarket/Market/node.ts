import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";
import {
    MarketStatus,
    clampLimit,
    createClobClient,
    createGammaClient,
    fetchEvents,
    fetchMarketById,
    fetchMarkets,
    fetchMidpoint,
    fetchOrderBook,
    searchMarketsLocal,
    summarizeMarkets,
} from "./fetch";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    public readonly Blueprint = Blueprint;

    private readonly gamma = createGammaClient();
    private readonly clob = createClobClient();

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const status = this.fieldValues.status as MarketStatus;
        const limit = clampLimit(this.fieldValues.maxResults, 20);
        const query = (incoming.query ?? "").trim();

        // Over-fetch so the local substring filter has something to narrow.
        const markets = await fetchMarkets(this.gamma, { status, limit: query ? Math.max(limit, 100) : limit });
        const filtered = searchMarketsLocal(markets, query, limit);
        const summary = summarizeMarkets(query, status, filtered);

        return { markets: filtered, summary };
    }

    protected override async onBuildTool(
        _incoming: InferIncoming<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        const defaultStatus = this.fieldValues.status as MarketStatus;
        const defaultLimit = clampLimit(this.fieldValues.maxResults, 20);

        const searchMarkets = tool(
            async ({ query, status, limit }) => {
                const effectiveStatus = (status ?? defaultStatus) as MarketStatus;
                const cap = clampLimit(limit, defaultLimit);
                const q = (query ?? "").trim();

                const markets = await fetchMarkets(this.gamma, { status: effectiveStatus, limit: q ? Math.max(cap, 100) : cap });
                const filtered = searchMarketsLocal(markets, q, cap);
                return JSON.stringify(summarizeMarkets(q, effectiveStatus, filtered));
            },
            {
                name: "polymarket_search_markets",
                description: "Search Polymarket markets by a substring of the question/slug. Returns a compact summary with the top matches and their outcome prices. Use polymarket_get_market for full detail on one.",
                schema: z.object({
                    query: z.string().optional().describe("Substring to match against the market question/slug. Omit to list top markets by volume."),
                    status: z.enum(["active", "closed", "all"]).optional().describe("Status filter. Defaults to the node's configured status."),
                    limit: z.number().int().min(1).max(500).optional().describe("Max markets to return. Defaults to the node's configured max."),
                }),
            },
        );

        const getMarket = tool(
            async ({ idOrSlug }) => {
                const key = (idOrSlug ?? "").trim();
                if (!key)
                    throw new Error("polymarket_get_market: 'idOrSlug' is required.");

                // Numeric -> market id endpoint; otherwise resolve by slug.
                if (/^\d+$/.test(key)) {
                    const market = await fetchMarketById(this.gamma, key);
                    return JSON.stringify(market ?? { error: `No market found for id '${key}'.` });
                }

                const bySlug = await fetchMarkets(this.gamma, { status: "all", limit: 1, slug: key });
                return JSON.stringify(bySlug[0] ?? { error: `No market found for slug '${key}'.` });
            },
            {
                name: "polymarket_get_market",
                description: "Fetch a single Polymarket market by numeric id or slug. Returns full market detail including outcomes, outcome prices and CLOB token ids.",
                schema: z.object({
                    idOrSlug: z.string().describe("Numeric market id (e.g. 12345) or market slug (e.g. 'will-x-happen')."),
                }),
            },
        );

        const getEvents = tool(
            async ({ status, limit }) => {
                const effectiveStatus = (status ?? defaultStatus) as MarketStatus;
                const cap = clampLimit(limit, defaultLimit);
                const events = await fetchEvents(this.gamma, { status: effectiveStatus, limit: cap });
                return JSON.stringify({ status: effectiveStatus, count: events.length, events });
            },
            {
                name: "polymarket_get_events",
                description: "List Polymarket events (an event groups related markets), ordered by volume. Returns compact event records.",
                schema: z.object({
                    status: z.enum(["active", "closed", "all"]).optional().describe("Status filter. Defaults to the node's configured status."),
                    limit: z.number().int().min(1).max(500).optional().describe("Max events to return. Defaults to the node's configured max."),
                }),
            },
        );

        const getMidpoint = tool(
            async ({ tokenId }) => {
                const id = (tokenId ?? "").trim();
                if (!id)
                    throw new Error("polymarket_get_midpoint: 'tokenId' is required (a CLOB token id from a market's clobTokenIds).");
                return JSON.stringify(await fetchMidpoint(this.clob, id));
            },
            {
                name: "polymarket_get_midpoint",
                description: "Get the current midpoint price for a Polymarket outcome token from the CLOB. Pass a CLOB token id (from a market's clobTokenIds).",
                schema: z.object({
                    tokenId: z.string().describe("CLOB token id for a single outcome, taken from a market's clobTokenIds array."),
                }),
            },
        );

        const getOrderBook = tool(
            async ({ tokenId }) => {
                const id = (tokenId ?? "").trim();
                if (!id)
                    throw new Error("polymarket_get_order_book: 'tokenId' is required (a CLOB token id from a market's clobTokenIds).");
                return JSON.stringify(await fetchOrderBook(this.clob, id));
            },
            {
                name: "polymarket_get_order_book",
                description: "Snapshot the CLOB order book (bids and asks) for a Polymarket outcome token. Pass a CLOB token id (from a market's clobTokenIds).",
                schema: z.object({
                    tokenId: z.string().describe("CLOB token id for a single outcome, taken from a market's clobTokenIds array."),
                }),
            },
        );

        return { tools: [searchMarkets, getMarket, getEvents, getMidpoint, getOrderBook] };
    }
}
