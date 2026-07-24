import { Polymarket } from "../domain";

export type MarketStatus = "active" | "closed" | "all";

// Gamma serializes these array fields as JSON strings — parse them back to arrays.
const parseJsonArray = (value: unknown): unknown => {
    if (typeof value !== "string")
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
};

export type PolymarketMarket = Polymarket.Gamma.Market;

export type CompactMarket = ReturnType<typeof compactMarket>;

export const compactMarket = (m: PolymarketMarket) => ({
    id: m.id ?? null,
    question: m.question ?? null,
    slug: m.slug ?? null,
    conditionId: m.conditionId ?? null,
    active: m.active ?? null,
    closed: m.closed ?? null,
    outcomes: parseJsonArray(m.outcomes) ?? null,
    outcomePrices: parseJsonArray(m.outcomePrices) ?? null,
    clobTokenIds: parseJsonArray(m.clobTokenIds) ?? null,
    volume: m.volume ?? null,
    liquidity: m.liquidity ?? null,
    endDate: m.endDate ?? null,
});

export type PolymarketEvent = Polymarket.Gamma.Event;

export type CompactEvent = ReturnType<typeof compactEvent>;

export const compactEvent = (e: PolymarketEvent) => ({
    id: e.id ?? null,
    title: e.title ?? null,
    slug: e.slug ?? null,
    active: e.active ?? null,
    closed: e.closed ?? null,
    volume: e.volume ?? null,
    liquidity: e.liquidity ?? null,
    endDate: e.endDate ?? null,
    marketCount: Array.isArray(e.markets) ? e.markets.length : null,
});
