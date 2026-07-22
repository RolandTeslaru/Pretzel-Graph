import { MarketApi, EventsApi } from "kalshi-typescript";
import { HTTP } from "@pretzel-graph/node-sdk";

// Pinned rather than inherited from the SDK, whose BASE_PATH can move between releases.
const BASE_PATH = "https://external-api.kalshi.com/trade-api/v2";

export type KalshiStatusField = "active" | "closed" | "all";

// Kalshi market/event status enums use "open" for live contracts.
export const toKalshiStatus = (s: KalshiStatusField): "open" | "closed" | undefined =>
    s === "active" ? "open" : s === "closed" ? "closed" : undefined;

export const clampLimit = (raw: number | undefined, fallback: number): number =>
    Math.min(Math.max(Math.trunc(raw ?? fallback), 1), 1000);

export type KalshiApis = {
    marketApi: MarketApi;
    eventsApi: EventsApi;
};

// Market data is public. Passing no Configuration leaves `auth` unset, so the SDK's
// RSA-PSS signing interceptor stays a no-op — the node sends unsigned requests.
// The client carries the node's proxy agents and the execution abort signal.
export const createKalshiApis = (client: HTTP.Client): KalshiApis => ({
    marketApi: new MarketApi(undefined, BASE_PATH, client.raw),
    eventsApi: new EventsApi(undefined, BASE_PATH, client.raw),
});

// SDK calls resolve to an AxiosResponse. Failures are already normalized to HTTP.Error
// by the client's interceptor, so there is nothing to catch here.
export const unwrap = async <T>(call: Promise<{ data: T }>): Promise<T> =>
    (await call).data;

export const compactMarket = (m: any) => ({
    ticker: m?.ticker ?? null,
    event_ticker: m?.event_ticker ?? null,
    title: m?.title ?? null,
    subtitle: m?.subtitle ?? null,
    status: m?.status ?? null,
    yes_bid_dollars: m?.yes_bid_dollars ?? null,
    yes_ask_dollars: m?.yes_ask_dollars ?? null,
    no_bid_dollars: m?.no_bid_dollars ?? null,
    no_ask_dollars: m?.no_ask_dollars ?? null,
    last_price_dollars: m?.last_price_dollars ?? null,
    volume_fp: m?.volume_fp ?? null,
    open_interest_fp: m?.open_interest_fp ?? null,
    liquidity_dollars: m?.liquidity_dollars ?? null,
    close_time: m?.close_time ?? null,
});

export const summarizeMarkets = (
    eventTicker: string,
    status: KalshiStatusField,
    markets: ReturnType<typeof compactMarket>[],
) => ({
    eventTicker: eventTicker || null,
    status,
    count: markets.length,
    tickers: markets.map(m => m.ticker).filter(Boolean).slice(0, 25),
});
