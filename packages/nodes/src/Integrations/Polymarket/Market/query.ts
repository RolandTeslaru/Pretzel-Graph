import { CompactMarket } from "./shapes";

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
