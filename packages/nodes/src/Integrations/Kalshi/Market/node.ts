import { tool } from "@langchain/core/tools";
import { z } from "zod/v3";

import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Workflow } from "@pretzel-graph/shared/domain";

import { Blueprint, ToolBlueprint } from "./blueprint";
import {
    KalshiApis,
    KalshiStatusField,
    clampLimit,
    compactMarket,
    createKalshiApis,
    summarizeMarkets,
    toKalshiStatus,
    unwrap,
} from "./fetch";


@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint, typeof ToolBlueprint> {

    public readonly Blueprint = Blueprint;

    private readonly apis: KalshiApis;

    constructor(workflowNode: Workflow.Node, context: RuntimeNode.ExecutionContext) {
        super(workflowNode, context);
        const { apiKeyId, privateKeyPem } = this.context.credentialsAPI.getDecryptedValue(this.credentials.kalshiApi.blob);
        this.apis = createKalshiApis(apiKeyId, privateKeyPem);
    }

    private async listMarkets(args: { status: KalshiStatusField; limit: number; eventTicker?: string }) {
        const apiStatus = toKalshiStatus(args.status) as any;
        const res = await unwrap(this.apis.marketApi.getMarkets(
            args.limit,
            undefined,            // cursor
            args.eventTicker || undefined,
            undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
            apiStatus,
        ));
        const markets = Array.isArray((res as any)?.markets) ? (res as any).markets : [];
        return markets.map(compactMarket);
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const status = this.fieldValues.status as KalshiStatusField;
        const limit = clampLimit(this.fieldValues.maxResults, 20);
        const eventTicker = (incoming.eventTicker ?? "").trim();

        const markets = await this.listMarkets({ status, limit, eventTicker });
        const summary = summarizeMarkets(eventTicker, status, markets);

        return { markets, summary };
    }

    protected override async onBuildTool(
        _incoming: InferIncoming<typeof ToolBlueprint>,
    ): Promise<InferOutputs<typeof ToolBlueprint>> {
        const defaultStatus = this.fieldValues.status as KalshiStatusField;
        const defaultLimit = clampLimit(this.fieldValues.maxResults, 20);

        const getMarkets = tool(
            async ({ status, eventTicker, limit }) => {
                const markets = await this.listMarkets({
                    status: (status ?? defaultStatus) as KalshiStatusField,
                    limit: clampLimit(limit, defaultLimit),
                    eventTicker: eventTicker?.trim() || undefined,
                });
                return JSON.stringify(summarizeMarkets(eventTicker ?? "", (status ?? defaultStatus) as KalshiStatusField, markets));
            },
            {
                name: "kalshi_get_markets",
                description: "List Kalshi markets, optionally scoped to an event ticker. Returns a compact summary with tickers and prices. Use kalshi_get_market for full detail on one.",
                schema: z.object({
                    status: z.enum(["active", "closed", "all"]).optional().describe("Status filter. Defaults to the node's configured status."),
                    eventTicker: z.string().optional().describe("Optional Kalshi event ticker to scope markets to one event, e.g. KXPRES-24."),
                    limit: z.number().int().min(1).max(1000).optional().describe("Max markets to return. Defaults to the node's configured max."),
                }),
            },
        );

        const getMarket = tool(
            async ({ ticker }) => {
                const t = (ticker ?? "").trim();
                if (!t)
                    throw new Error("kalshi_get_market: 'ticker' is required.");
                const res = await unwrap(this.apis.marketApi.getMarket(t));
                return JSON.stringify((res as any)?.market ?? res);
            },
            {
                name: "kalshi_get_market",
                description: "Fetch a single Kalshi market by its ticker. Returns full market detail including prices, status and close time.",
                schema: z.object({
                    ticker: z.string().describe("Kalshi market ticker, e.g. KXPRES-24-DJT."),
                }),
            },
        );

        const getEvents = tool(
            async ({ status, seriesTicker, limit }) => {
                const apiStatus = toKalshiStatus((status ?? defaultStatus) as KalshiStatusField) as any;
                const cap = clampLimit(limit, defaultLimit);
                const res = await unwrap(this.apis.eventsApi.getEvents(
                    cap,
                    undefined,                       // cursor
                    false,                           // withNestedMarkets
                    undefined,                       // withMilestones
                    apiStatus,
                    seriesTicker?.trim() || undefined,
                ));
                const events = Array.isArray((res as any)?.events) ? (res as any).events : [];
                return JSON.stringify({ status: status ?? defaultStatus, count: events.length, events });
            },
            {
                name: "kalshi_get_events",
                description: "List Kalshi events (an event groups related markets), optionally scoped to a series ticker.",
                schema: z.object({
                    status: z.enum(["active", "closed", "all"]).optional().describe("Status filter. Defaults to the node's configured status."),
                    seriesTicker: z.string().optional().describe("Optional Kalshi series ticker to scope events to one series."),
                    limit: z.number().int().min(1).max(1000).optional().describe("Max events to return. Defaults to the node's configured max."),
                }),
            },
        );

        const getOrderbook = tool(
            async ({ ticker, depth }) => {
                const t = (ticker ?? "").trim();
                if (!t)
                    throw new Error("kalshi_get_orderbook: 'ticker' is required.");
                const res = await unwrap(this.apis.marketApi.getMarketOrderbook(t, depth));
                return JSON.stringify(res);
            },
            {
                name: "kalshi_get_orderbook",
                description: "Snapshot the order book (bids/asks) for a Kalshi market. Pass the market ticker.",
                schema: z.object({
                    ticker: z.string().describe("Kalshi market ticker, e.g. KXPRES-24-DJT."),
                    depth: z.number().int().min(1).max(100).optional().describe("Order book depth (number of price levels per side)."),
                }),
            },
        );

        return { tools: [getMarkets, getMarket, getEvents, getOrderbook] };
    }
}
