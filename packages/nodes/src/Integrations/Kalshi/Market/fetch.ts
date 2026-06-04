import axios from "axios";
import { Configuration, MarketApi, EventsApi } from "kalshi-typescript";

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

export const createKalshiApis = (apiKeyId: string, privateKeyPem: string): KalshiApis => {
    if (!apiKeyId || !privateKeyPem)
        throw new Error("Kalshi: API Key ID and RSA Private Key (PEM) are required.");

    const config = new Configuration({ apiKey: apiKeyId, privateKeyPem });

    // IMPORTANT: each API gets its own axios instance. The SDK's RSA-PSS signing
    // interceptor is registered on the axios instance passed to the constructor;
    // if we let it default to the global axios singleton it would sign EVERY
    // request made by other nodes in this process.
    const marketApi = new MarketApi(config, undefined, axios.create());
    const eventsApi = new EventsApi(config, undefined, axios.create());

    return { marketApi, eventsApi };
};

const formatKalshiError = (err: unknown): Error => {
    if (!axios.isAxiosError(err))
        return err instanceof Error ? err : new Error(String(err));

    const status = err.response?.status;
    const statusText = err.response?.statusText;
    const body = err.response?.data;
    const bodyText = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
    const suffix = status ? ` -> ${status}${statusText ? ` ${statusText}` : ""}` : "";
    return new Error(`Kalshi request failed${suffix}.${bodyText ? ` Response: ${bodyText}` : ""}`);
};

// Unwrap an SDK call (returns AxiosResponse) into its data, with a clean error.
export const unwrap = async <T>(call: Promise<{ data: T }>): Promise<T> => {
    try {
        return (await call).data;
    }
    catch (err) {
        throw formatKalshiError(err);
    }
};

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
