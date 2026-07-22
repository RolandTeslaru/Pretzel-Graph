import type { AxiosRequestConfig } from "axios";
import { HTTP } from "@pretzel-graph/node-sdk";

export const MASSIVE_API_BASE_URL = "https://api.massive.com";

export type MassiveAgg = {
    /** Timestamp in ms */
    t: number;
    /** Open */
    o: number;
    /** Close */
    c: number;
    /** High */
    h: number;
    /** Low */
    l: number;
    /** Volume */
    v: number;
    /** Optional VWAP */
    vw?: number;
    /** Optional transaction count */
    n?: number;
};

type AggsResponse = {
    results?: MassiveAgg[];
    resultsCount?: number;
    ticker?: string;
    adjusted?: boolean;
};

export const normalizeTicker = (raw: string | undefined): string => (raw ?? "").trim().toUpperCase();

export const requireMassiveApiKey = (raw: string | undefined): string => {
    const key = (raw && raw.trim()) || (process.env.MASSIVE_API_KEY ?? "") || (process.env.POLY_API_KEY ?? "");
    if (!key)
        throw new Error("Massive Market: API key is required. Set the node's API Key field or MASSIVE_API_KEY / POLY_API_KEY env var.");
    return key;
};

export const summarizeAggs = (ticker: string, timespan: string, multiplier: number, aggs: MassiveAgg[]) => {
    if (!aggs.length) {
        return { ticker, timespan, multiplier, count: 0, firstClose: null, lastClose: null, change: null, changePct: null };
    }
    const firstClose = Number(aggs[0].c);
    const lastClose = Number(aggs[aggs.length - 1].c);
    const change = lastClose - firstClose;
    const changePct = firstClose === 0 ? null : (change / firstClose) * 100;
    return { ticker, timespan, multiplier, count: aggs.length, firstClose, lastClose, change, changePct };
};

export const createMassiveClient = (http: HTTP.ClientAPI, apiKey: string): HTTP.Client =>
    http.create({
        vendor: "Massive",
        baseURL: MASSIVE_API_BASE_URL,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            // Some endpoints/providers expect API keys via header instead of Authorization.
            "x-api-key": apiKey,
            "X-Polygon-Api-Key": apiKey,
            "User-Agent": "PretzelGraph/1.0",
        },
        // Some endpoints/providers expect API keys via query param.
        params: {
            apiKey,
        },
    });

// The client already normalizes failures. The one Massive-specific detail worth adding:
// a 403 here is usually a plan/entitlement limit rather than a bad key.
const massiveGet = async <T>(client: HTTP.Client, url: string, config?: AxiosRequestConfig): Promise<T> => {

    try {
        return await client.get<T>(url, config);
    }
    catch (err) {

        if (err instanceof HTTP.Error && err.status === 403)
            throw new HTTP.Error(
                `${err.message} Your API key/plan may not have access to this endpoint.`,
                err.vendor, err.method, err.url, err.status, err.body,
            );

        throw err;
    }
};

export const fetchAggs = async (
    client: HTTP.Client,
    args: {
        ticker: string;
        multiplier: number;
        timespan: "minute" | "hour" | "day";
        lookbackHours: number;
        adjusted: boolean;
    },
): Promise<MassiveAgg[]> => {
    const endTime = Date.now();
    const startTime = endTime - args.lookbackHours * 60 * 60 * 1000;

    const url = `/v2/aggs/ticker/${encodeURIComponent(args.ticker)}/range/${args.multiplier}/${args.timespan}/${startTime}/${endTime}`;
    const data = await massiveGet<AggsResponse>(client, url, {
        params: {
            adjusted: args.adjusted,
            sort: "asc",
            limit: 50000,
        },
    });

    return data.results ?? [];
};

export const fetchSnapshot = async (client: HTTP.Client, ticker: string): Promise<unknown> => {
    const url = `/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}`;
    return massiveGet<unknown>(client, url);
};

export const fetchLastTrade = async (client: HTTP.Client, ticker: string): Promise<unknown> => {
    const url = `/v2/last/trade/${encodeURIComponent(ticker)}`;
    return massiveGet<unknown>(client, url);
};

export const fetchLastQuote = async (client: HTTP.Client, ticker: string): Promise<unknown> => {
    // Historic Polygon endpoint name; Massive keeps compatibility.
    const url = `/v2/last/nbbo/${encodeURIComponent(ticker)}`;
    return massiveGet<unknown>(client, url);
};

export const fetchTickerDetails = async (client: HTTP.Client, ticker: string): Promise<unknown> => {
    const url = `/v3/reference/tickers/${encodeURIComponent(ticker)}`;
    return massiveGet<unknown>(client, url);
};

export const searchTickers = async (client: HTTP.Client, query: string, limit: number): Promise<unknown> => {
    return massiveGet<unknown>(client, `/v3/reference/tickers`, {
        params: {
            search: query,
            market: "stocks",
            locale: "us",
            active: true,
            limit,
        },
    });
};

type MassiveNewsItem = {
    id?: string;
    title?: string;
    description?: string;
    article_url?: string;
    publisher?: { name?: string };
    published_utc?: string;
    tickers?: string[];
};

type MassiveNewsResponse = {
    results?: MassiveNewsItem[];
    count?: number;
    next_url?: string;
};

export const fetchNews = async (client: HTTP.Client, args: {
    ticker?: string;
    limit: number;
    publishedAfter?: string;
    publishedBefore?: string;
    order?: "asc" | "desc";
}): Promise<MassiveNewsResponse> => {
    // Polygon-compatible endpoint.
    return massiveGet<MassiveNewsResponse>(client, `/v2/reference/news`, {
        params: {
            ticker: args.ticker,
            limit: args.limit,
            order: args.order ?? "desc",
            ...(args.publishedAfter ? { "published_utc.gte": args.publishedAfter } : {}),
            ...(args.publishedBefore ? { "published_utc.lte": args.publishedBefore } : {}),
        },
    });
};

export const compactNews = (data: MassiveNewsResponse) => {
    const results = (data.results ?? []).map(r => ({
        id: r.id ?? null,
        title: r.title ?? null,
        publishedUtc: r.published_utc ?? null,
        publisher: r.publisher?.name ?? null,
        url: r.article_url ?? null,
        tickers: r.tickers ?? null,
        description: r.description ?? null,
    }));

    return {
        count: data.count ?? results.length,
        nextUrl: data.next_url ?? null,
        results,
    };
};

type FinancialsResponse = {
    results?: unknown[],
};

export const fetchFinancials = async (
    client: HTTP.Client,
    args: { ticker: string, timeframe: "annual" | "quarterly", limit: number },
): Promise<unknown[]> => {

    const data = await massiveGet<FinancialsResponse>(client, `/vX/reference/financials`, {
        params: {
            ticker: args.ticker,
            timeframe: args.timeframe,
            limit: args.limit,
            order: "desc",
            sort: "period_of_report_date",
        },
    });

    return data.results ?? [];
};

export const fetchMarketStatus = async (client: HTTP.Client): Promise<unknown> =>
    massiveGet<unknown>(client, `/v1/marketstatus/now`);
