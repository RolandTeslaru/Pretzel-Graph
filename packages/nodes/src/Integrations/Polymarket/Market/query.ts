import { PolymarketGammaClient } from "../client";
import {
    compactEvent,
    compactMarket,
    type CompactMarket,
    type MarketStatus,
} from "./shapes";

export const clampLimit = (
    raw: number | undefined,
    fallback: number,
    maximum = 500,
): number =>
    Math.min(Math.max(Math.trunc(raw ?? fallback), 1), maximum);

// Substring filter applied locally (Gamma has no full-text search param).
export const searchMarketsLocal = (markets: CompactMarket[], query: string, limit: number): CompactMarket[] => {
    const q = query.trim().toLowerCase();
    if (!q)
        return markets.slice(0, limit);

    return markets
        .filter(m => (m.question ?? "").toLowerCase().includes(q) || (m.slug ?? "").toLowerCase().includes(q))
        .slice(0, limit);
};


const statusQuery = (
    status: MarketStatus,
): { active?: boolean; closed?: boolean } => {
    if (status === "active")
        return { active: true, closed: false };
    if (status === "closed")
        return { closed: true };
    return {};
};

export const listMarkets = async (
    gamma: PolymarketGammaClient,
    status: MarketStatus,
    limit: number,
) => {
    const request = {
        limit,
        order:     "volume",
        ascending: false,
    } as const;

    const markets = status === "all"
        ? (await Promise.all([
            gamma.markets.list({
                ...request,
                active: true,
                closed: false,
            }),
            gamma.markets.list({
                ...request,
                closed: true,
            }),
        ])).flat()
        : await gamma.markets.list({
            ...request,
            ...statusQuery(status),
        });

    const unique = new Map(
        markets.map(market => [
            market.id ?? market.slug ?? JSON.stringify(market),
            compactMarket(market),
        ]),
    );

    return [...unique.values()]
        .sort((left, right) =>
            Number(right.volume ?? 0) - Number(left.volume ?? 0))
        .slice(0, limit);
};

export const listEvents = async (
    gamma: PolymarketGammaClient,
    status: MarketStatus,
    limit: number,
) => {
    const events = await gamma.events.list({
        ...statusQuery(status),
        limit,
        order:     "volume",
        ascending: false,
    });

    return events.map(compactEvent);
};
