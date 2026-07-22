import { HTTP } from "@pretzel-graph/node-sdk";

import {
    CompactEvent, CompactMarket, MarketStatus,
    PolymarketEvent, PolymarketMarket,
    compactEvent, compactMarket,
} from "./shapes";

export const POLYMARKET_GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
export const POLYMARKET_CLOB_BASE_URL  = "https://clob.polymarket.com";

const statusParams = (status: MarketStatus): Record<string, boolean> => {
    if (status === "active")
        return { active: true, closed: false };
    if (status === "closed")
        return { closed: true };
    return {};
};

export class PolymarketClient {

    private readonly gamma: HTTP.Client;
    private readonly clob:  HTTP.Client;

    constructor(http: HTTP.ClientAPI) {
        const shared = { vendor: "Polymarket", headers: { "User-Agent": "PretzelGraph/1.0" } };
        this.gamma = http.create({ ...shared, baseURL: POLYMARKET_GAMMA_BASE_URL });
        this.clob  = http.create({ ...shared, baseURL: POLYMARKET_CLOB_BASE_URL });
    }

    async getMarkets(args: { status: MarketStatus, limit: number, slug?: string }): Promise<CompactMarket[]> {
        const data = await this.gamma.get<PolymarketMarket[]>("/markets", {
            params: {
                ...statusParams(args.status),
                ...(args.slug ? { slug: args.slug } : {}),
                limit: args.limit,
                order: "volume",
                ascending: false,
            },
        });
        return Array.isArray(data) ? data.map(compactMarket) : [];
    }

    async marketById(id: string): Promise<CompactMarket | null> {
        const data = await this.gamma.get<PolymarketMarket>(`/markets/${encodeURIComponent(id)}`);
        return data ? compactMarket(data) : null;
    }

    async events(args: { status: MarketStatus, limit: number }): Promise<CompactEvent[]> {
        const data = await this.gamma.get<PolymarketEvent[]>("/events", {
            params: { ...statusParams(args.status), limit: args.limit, order: "volume", ascending: false },
        });
        return Array.isArray(data) ? data.map(compactEvent) : [];
    }

    midpoint(tokenId: string): Promise<unknown> {
        return this.clob.get<unknown>("/midpoint", { params: { token_id: tokenId } });
    }

    orderBook(tokenId: string): Promise<unknown> {
        return this.clob.get<unknown>("/book", { params: { token_id: tokenId } });
    }
}
