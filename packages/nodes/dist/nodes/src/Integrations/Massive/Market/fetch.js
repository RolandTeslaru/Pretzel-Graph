"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMarketStatus = exports.fetchFinancials = exports.compactNews = exports.fetchNews = exports.searchTickers = exports.fetchTickerDetails = exports.fetchLastQuote = exports.fetchLastTrade = exports.fetchSnapshot = exports.fetchAggs = exports.createMassiveClient = exports.summarizeAggs = exports.requireMassiveApiKey = exports.normalizeTicker = exports.MASSIVE_API_BASE_URL = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.MASSIVE_API_BASE_URL = "https://api.massive.com";
const normalizeTicker = (raw) => (raw ?? "").trim().toUpperCase();
exports.normalizeTicker = normalizeTicker;
const requireMassiveApiKey = (raw) => {
    const key = (raw && raw.trim()) || (process.env.MASSIVE_API_KEY ?? "") || (process.env.POLY_API_KEY ?? "");
    if (!key)
        throw new Error("Massive Market: API key is required. Set the node's API Key field or MASSIVE_API_KEY / POLY_API_KEY env var.");
    return key;
};
exports.requireMassiveApiKey = requireMassiveApiKey;
const summarizeAggs = (ticker, timespan, multiplier, aggs) => {
    if (!aggs.length) {
        return { ticker, timespan, multiplier, count: 0, firstClose: null, lastClose: null, change: null, changePct: null };
    }
    const firstClose = Number(aggs[0].c);
    const lastClose = Number(aggs[aggs.length - 1].c);
    const change = lastClose - firstClose;
    const changePct = firstClose === 0 ? null : (change / firstClose) * 100;
    return { ticker, timespan, multiplier, count: aggs.length, firstClose, lastClose, change, changePct };
};
exports.summarizeAggs = summarizeAggs;
const createMassiveClient = (http, apiKey) => http.create({
    vendor: "Massive",
    baseURL: exports.MASSIVE_API_BASE_URL,
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
exports.createMassiveClient = createMassiveClient;
// The client already normalizes failures. The one Massive-specific detail worth adding:
// a 403 here is usually a plan/entitlement limit rather than a bad key.
const massiveGet = async (client, url, config) => {
    try {
        return await client.get(url, config);
    }
    catch (err) {
        if (err instanceof node_sdk_1.HTTP.Error && err.status === 403)
            throw new node_sdk_1.HTTP.Error(`${err.message} Your API key/plan may not have access to this endpoint.`, err.vendor, err.method, err.url, err.status, err.body);
        throw err;
    }
};
const fetchAggs = async (client, args) => {
    const endTime = Date.now();
    const startTime = endTime - args.lookbackHours * 60 * 60 * 1000;
    const url = `/v2/aggs/ticker/${encodeURIComponent(args.ticker)}/range/${args.multiplier}/${args.timespan}/${startTime}/${endTime}`;
    const data = await massiveGet(client, url, {
        params: {
            adjusted: args.adjusted,
            sort: "asc",
            limit: 50000,
        },
    });
    return data.results ?? [];
};
exports.fetchAggs = fetchAggs;
const fetchSnapshot = async (client, ticker) => {
    const url = `/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}`;
    return massiveGet(client, url);
};
exports.fetchSnapshot = fetchSnapshot;
const fetchLastTrade = async (client, ticker) => {
    const url = `/v2/last/trade/${encodeURIComponent(ticker)}`;
    return massiveGet(client, url);
};
exports.fetchLastTrade = fetchLastTrade;
const fetchLastQuote = async (client, ticker) => {
    // Historic Polygon endpoint name; Massive keeps compatibility.
    const url = `/v2/last/nbbo/${encodeURIComponent(ticker)}`;
    return massiveGet(client, url);
};
exports.fetchLastQuote = fetchLastQuote;
const fetchTickerDetails = async (client, ticker) => {
    const url = `/v3/reference/tickers/${encodeURIComponent(ticker)}`;
    return massiveGet(client, url);
};
exports.fetchTickerDetails = fetchTickerDetails;
const searchTickers = async (client, query, limit) => {
    return massiveGet(client, `/v3/reference/tickers`, {
        params: {
            search: query,
            market: "stocks",
            locale: "us",
            active: true,
            limit,
        },
    });
};
exports.searchTickers = searchTickers;
const fetchNews = async (client, args) => {
    // Polygon-compatible endpoint.
    return massiveGet(client, `/v2/reference/news`, {
        params: {
            ticker: args.ticker,
            limit: args.limit,
            order: args.order ?? "desc",
            ...(args.publishedAfter ? { "published_utc.gte": args.publishedAfter } : {}),
            ...(args.publishedBefore ? { "published_utc.lte": args.publishedBefore } : {}),
        },
    });
};
exports.fetchNews = fetchNews;
const compactNews = (data) => {
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
exports.compactNews = compactNews;
const fetchFinancials = async (client, args) => {
    const data = await massiveGet(client, `/vX/reference/financials`, {
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
exports.fetchFinancials = fetchFinancials;
const fetchMarketStatus = async (client) => massiveGet(client, `/v1/marketstatus/now`);
exports.fetchMarketStatus = fetchMarketStatus;
