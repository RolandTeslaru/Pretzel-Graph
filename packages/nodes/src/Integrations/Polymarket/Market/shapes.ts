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

export type PolymarketMarket = {
    id?: string;
    question?: string;
    slug?: string;
    conditionId?: string;
    active?: boolean;
    closed?: boolean;
    outcomes?: unknown;
    outcomePrices?: unknown;
    clobTokenIds?: unknown;
    volume?: string | number;
    liquidity?: string | number;
    endDate?: string;
};

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

export type PolymarketEvent = {
    id?: string;
    title?: string;
    slug?: string;
    active?: boolean;
    closed?: boolean;
    volume?: string | number;
    liquidity?: string | number;
    endDate?: string;
    markets?: PolymarketMarket[];
};

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
