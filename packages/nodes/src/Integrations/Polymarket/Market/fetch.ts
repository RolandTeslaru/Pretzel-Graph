import axios, { AxiosInstance } from "axios";

export const POLYMARKET_GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
export const POLYMARKET_CLOB_BASE_URL = "https://clob.polymarket.com";

export type MarketStatus = "active" | "closed" | "all";

export const createGammaClient = (): AxiosInstance =>
    axios.create({
        baseURL: POLYMARKET_GAMMA_BASE_URL,
        headers: { "User-Agent": "PretzelGraph/1.0" },
    });

export const createClobClient = (): AxiosInstance =>
    axios.create({
        baseURL: POLYMARKET_CLOB_BASE_URL,
        headers: { "User-Agent": "PretzelGraph/1.0" },
    });

const formatAxiosFailure = (method: string, url: string, err: unknown): Error => {
    if (!axios.isAxiosError(err))
        return err instanceof Error ? err : new Error(String(err));

    const status = err.response?.status;
    const statusText = err.response?.statusText;

    const body = err.response?.data;
    const bodyText =
        body === undefined
            ? ""
            : typeof body === "string"
                ? body
                : JSON.stringify(body);

    const suffix = status ? ` -> ${status}${statusText ? ` ${statusText}` : ""}` : "";
    const message = `Polymarket request failed: ${method.toUpperCase()} ${url}${suffix}.${bodyText ? ` Response: ${bodyText}` : ""}`;
    return new Error(message);
};

const get = async <T>(client: AxiosInstance, url: string, config?: Parameters<AxiosInstance["get"]>[1]): Promise<T> => {
    try {
        const { data } = await client.get<T>(url, config);
        return data;
    }
    catch (err) {
        throw formatAxiosFailure("GET", url, err);
    }
};

export const clampLimit = (raw: number | undefined, fallback: number): number =>
    Math.min(Math.max(Math.trunc(raw ?? fallback), 1), 500);

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

const statusParams = (status: MarketStatus): Record<string, boolean> => {
    if (status === "active")
        return { active: true, closed: false };
    if (status === "closed")
        return { closed: true };
    return {};
};

// ---- Markets (Gamma) ----

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

export const fetchMarkets = async (client: AxiosInstance, args: {
    status: MarketStatus;
    limit: number;
    slug?: string;
}): Promise<ReturnType<typeof compactMarket>[]> => {
    const data = await get<PolymarketMarket[]>(client, "/markets", {
        params: {
            ...statusParams(args.status),
            ...(args.slug ? { slug: args.slug } : {}),
            limit: args.limit,
            order: "volume",
            ascending: false,
        },
    });

    if (!Array.isArray(data))
        return [];

    return data.map(compactMarket);
};

export const fetchMarketById = async (client: AxiosInstance, id: string): Promise<ReturnType<typeof compactMarket> | null> => {
    const data = await get<PolymarketMarket>(client, `/markets/${encodeURIComponent(id)}`);
    return data ? compactMarket(data) : null;
};

// Substring filter applied locally (Gamma has no full-text search param).
export const searchMarketsLocal = (markets: ReturnType<typeof compactMarket>[], query: string, limit: number) => {
    const q = query.trim().toLowerCase();
    if (!q)
        return markets.slice(0, limit);

    return markets
        .filter(m => (m.question ?? "").toLowerCase().includes(q) || (m.slug ?? "").toLowerCase().includes(q))
        .slice(0, limit);
};

export const summarizeMarkets = (query: string, status: MarketStatus, markets: ReturnType<typeof compactMarket>[]) => ({
    query: query || null,
    status,
    count: markets.length,
    top: markets.slice(0, 5).map(m => ({ question: m.question, slug: m.slug, outcomePrices: m.outcomePrices })),
});

// ---- Events (Gamma) ----

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

export const fetchEvents = async (client: AxiosInstance, args: {
    status: MarketStatus;
    limit: number;
}): Promise<ReturnType<typeof compactEvent>[]> => {
    const data = await get<PolymarketEvent[]>(client, "/events", {
        params: {
            ...statusParams(args.status),
            limit: args.limit,
            order: "volume",
            ascending: false,
        },
    });

    if (!Array.isArray(data))
        return [];

    return data.map(compactEvent);
};

// ---- Prices / order book (CLOB) ----

export const fetchMidpoint = async (clob: AxiosInstance, tokenId: string): Promise<unknown> =>
    get<unknown>(clob, "/midpoint", { params: { token_id: tokenId } });

export const fetchOrderBook = async (clob: AxiosInstance, tokenId: string): Promise<unknown> =>
    get<unknown>(clob, "/book", { params: { token_id: tokenId } });
