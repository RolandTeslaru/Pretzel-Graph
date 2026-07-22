import { HTTP } from "@pretzel-graph/node-sdk";

export const ALPACA_DATA_BASE_URL = "https://data.alpaca.markets";
export const ALPACA_TRADING_LIVE_BASE_URL = "https://api.alpaca.markets";
export const ALPACA_TRADING_PAPER_BASE_URL = "https://paper-api.alpaca.markets";

export type AlpacaEnvironment = "live" | "paper";

export const normalizeSymbol = (raw: string | undefined): string => (raw ?? "").trim().toUpperCase();

export const requireAlpacaCredentials = (keyIdRaw: string | undefined, secretRaw: string | undefined) => {
    const keyId = (keyIdRaw && keyIdRaw.trim()) || (process.env.ALPACA_API_KEY_ID ?? "");
    const secret = (secretRaw && secretRaw.trim()) || (process.env.ALPACA_API_SECRET_KEY ?? "");

    if (!keyId || !secret)
        throw new Error("Alpaca Market: API Key ID and API Secret are required. Set the node fields or ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY env vars.");

    return { keyId, secret };
};

export const createAlpacaDataClient = (http: HTTP.ClientAPI, credentials: { keyId: string; secret: string }): HTTP.Client =>
    http.create({
        vendor: "Alpaca",
        baseURL: ALPACA_DATA_BASE_URL,
        headers: {
            "APCA-API-KEY-ID": credentials.keyId,
            "APCA-API-SECRET-KEY": credentials.secret,
            "User-Agent": "PretzelGraph/1.0",
        },
    });

export const createAlpacaTradingClient = (
    http: HTTP.ClientAPI,
    env: AlpacaEnvironment,
    credentials: { keyId: string; secret: string },
): HTTP.Client => {
    const baseURL = env === "paper" ? ALPACA_TRADING_PAPER_BASE_URL : ALPACA_TRADING_LIVE_BASE_URL;
    return http.create({
        vendor: "Alpaca",
        baseURL,
        headers: {
            "APCA-API-KEY-ID": credentials.keyId,
            "APCA-API-SECRET-KEY": credentials.secret,
            "User-Agent": "PretzelGraph/1.0",
        },
    });
};

export const toAlpacaTimeframe = (timespan: "minute" | "hour" | "day", multiplier: number): string => {
    if (multiplier < 1)
        throw new Error("Alpaca Market: multiplier must be >= 1.");

    if (timespan === "minute") {
        if (multiplier > 59)
            throw new Error("Alpaca Market: minute multiplier must be <= 59.");
        return `${multiplier}Min`;
    }

    if (timespan === "hour") {
        if (multiplier > 23)
            throw new Error("Alpaca Market: hour multiplier must be <= 23.");
        return `${multiplier}Hour`;
    }

    // day
    if (multiplier !== 1)
        throw new Error("Alpaca Market: day timeframe only supports multiplier = 1.");
    return "1Day";
};

export type AlpacaBar = {
    t: string; // RFC3339
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    n?: number;
    vw?: number;
};

type AlpacaBarsResponse = {
    bars?: Record<string, AlpacaBar[]>;
    next_page_token?: string;
};

export const fetchBars = async (client: HTTP.Client, args: {
    symbol: string;
    timeframe: string;
    lookbackHours: number;
    limit: number;
}): Promise<AlpacaBar[]> => {
    const end = new Date();
    const start = new Date(end.getTime() - args.lookbackHours * 60 * 60 * 1000);

    const data = await client.get<AlpacaBarsResponse>(`/v2/stocks/bars`, {
        params: {
            symbols: args.symbol,
            timeframe: args.timeframe,
            start: start.toISOString(),
            end: end.toISOString(),
            limit: args.limit,
            adjustment: "raw",
        },
    });

    return data.bars?.[args.symbol] ?? [];
};

export const summarizeBars = (symbol: string, timeframe: string, bars: AlpacaBar[]) => {
    if (!bars.length)
        return { symbol, timeframe, count: 0, firstClose: null, lastClose: null, change: null, changePct: null };

    const firstClose = Number(bars[0].c);
    const lastClose = Number(bars[bars.length - 1].c);
    const change = lastClose - firstClose;
    const changePct = firstClose === 0 ? null : (change / firstClose) * 100;

    return { symbol, timeframe, count: bars.length, firstClose, lastClose, change, changePct };
};

export const fetchLatestTrade = async (client: HTTP.Client, symbol: string): Promise<unknown> => {
    return client.get<unknown>(`/v2/stocks/trades/latest`, {
        params: { symbols: symbol },
    });
};

export const fetchLatestQuote = async (client: HTTP.Client, symbol: string): Promise<unknown> => {
    return client.get<unknown>(`/v2/stocks/quotes/latest`, {
        params: { symbols: symbol },
    });
};

type AlpacaNewsItem = {
    id?: number;
    headline?: string;
    summary?: string;
    url?: string;
    source?: string;
    created_at?: string;
    symbols?: string[];
};

type AlpacaNewsResponse = {
    news?: AlpacaNewsItem[];
    next_page_token?: string;
};

export const fetchNews = async (client: HTTP.Client, args: {
    symbol: string;
    limit: number;
    start?: string;
    end?: string;
}): Promise<AlpacaNewsResponse> => {
    return client.get<AlpacaNewsResponse>(`/v1beta1/news`, {
        params: {
            symbols: args.symbol,
            limit: args.limit,
            ...(args.start ? { start: args.start } : {}),
            ...(args.end ? { end: args.end } : {}),
        },
    });
};

export const compactNews = (data: AlpacaNewsResponse) => {
    const results = (data.news ?? []).map(n => ({
        id: n.id ?? null,
        headline: n.headline ?? null,
        createdAt: n.created_at ?? null,
        source: n.source ?? null,
        url: n.url ?? null,
        symbols: n.symbols ?? null,
        summary: n.summary ?? null,
    }));

    return {
        count: results.length,
        nextPageToken: data.next_page_token ?? null,
        results,
    };
};

type AlpacaAsset = {
    id?: string;
    symbol?: string;
    name?: string;
    exchange?: string;
    status?: string;
    tradable?: boolean;
    fractionable?: boolean;
};

export const listAssets = async (client: HTTP.Client, status: "active" | "inactive" | "all"): Promise<AlpacaAsset[]> => {
    const data = await client.get<unknown>(`/v2/assets`, {
        params: { status },
    });

    if (!Array.isArray(data))
        return [];

    return data as AlpacaAsset[];
};

export const searchAssetsLocal = (assets: AlpacaAsset[], query: string, limit: number) => {
    const q = query.trim().toLowerCase();
    if (!q)
        return { count: 0, results: [] };

    const results = assets
        .filter(a => {
            const symbol = (a.symbol ?? "").toLowerCase();
            const name = (a.name ?? "").toLowerCase();
            return symbol.includes(q) || name.includes(q);
        })
        .slice(0, limit)
        .map(a => ({
            id: a.id ?? null,
            symbol: a.symbol ?? null,
            name: a.name ?? null,
            exchange: a.exchange ?? null,
            status: a.status ?? null,
            tradable: a.tradable ?? null,
            fractionable: a.fractionable ?? null,
        }));

    return { count: results.length, results };
};
