import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode, RuntimeNode, InferFieldValues, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import {
    PolymarketDataClient,
    PolymarketGammaClient,
    PolymarketUnauthenticatedCLOBClient,
} from "../client";
import { Polymarket } from "../domain";
import { MarketAction } from "./actions";
import { Blueprint, ToolBlueprint } from "./blueprint";
import { clampLimit, searchMarketsLocal } from "./query";
import { listEvents, listMarkets, runMarketAction } from "./run";
import { MarketStatus } from "./shapes";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    private readonly gammaClient: PolymarketGammaClient;
    private readonly clobClient:  PolymarketUnauthenticatedCLOBClient;
    private readonly dataClient:  PolymarketDataClient;

    constructor(nodeId: Workflow.Node.Id, context: RuntimeNode.ExecutionContext) {
        super(nodeId, context);
        this.gammaClient = new PolymarketGammaClient(this.httpClientFactory);
        this.clobClient  = new PolymarketUnauthenticatedCLOBClient(this.httpClientFactory);
        this.dataClient  = new PolymarketDataClient(this.httpClientFactory);
    }

    protected override async onRun(): Promise<InferOutputs<typeof Blueprint>> {
        // reconcile-added fields aren't in the inferred field values, so they're read via a cast.
        const fields = this.fieldValues as unknown as Record<string, unknown>;

        const result = await runMarketAction({
            action:  MarketAction.resolve(fields),
            fields,
            clients: {
                gamma: this.gammaClient,
                clob:  this.clobClient,
                data:  this.dataClient,
            },
        });

        return result as InferOutputs<typeof Blueprint>;
    }

    protected override async onBuildTool(
        _incoming: InferIncoming<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        // In tool mode the node carries the tool blueprint's fields, not the base cascade's.
        const fields = this.fieldValues as unknown as InferFieldValues<typeof ToolBlueprint>;
        const defaultStatus = fields.status as MarketStatus;
        const defaultLimit  = clampLimit(fields.maxResults, 20);

        const searchMarkets = tool(
            async ({ query, status, limit }) => {
                const effectiveStatus = (status ?? defaultStatus) as MarketStatus;
                const cap = clampLimit(limit, defaultLimit);
                const q = (query ?? "").trim();

                const markets = await listMarkets(this.gammaClient, effectiveStatus, q ? Math.max(cap, 100) : cap);
                const filtered = searchMarketsLocal(markets, q, cap);
                return JSON.stringify({ status: effectiveStatus, count: filtered.length, markets: filtered });
            },
            {
                name: "polymarket_search_markets",
                description: "Search Polymarket markets by a substring of the question/slug. Returns matching markets with their outcomes and outcome prices, ordered by volume.",
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
                    const market = await this.gammaClient.markets.getById({
                        id: Polymarket.Gamma.Market.Id.parse(key),
                    });
                    return JSON.stringify(market);
                }

                const market = await this.gammaClient.markets.getBySlug({ slug: key });
                return JSON.stringify(market);
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
                const events = await listEvents(this.gammaClient, effectiveStatus, cap);
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
                return JSON.stringify(await this.clobClient.marketData.getMidpoint({ token_id: id }));
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
                return JSON.stringify(await this.clobClient.marketData.getOrderBook({ token_id: id }));
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
