import { HTTP } from "@pretzel-graph/node-sdk";

export const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

export type Candle = {
    t: number, T: number, s: string, i: string,
    o: string, c: string, h: string, l: string,
    v: string, n: number,
};

export type ClearinghouseState = {
    marginSummary?: unknown,
    crossMarginSummary?: unknown,
    withdrawable?: string,
    assetPositions?: Array<{ position: unknown, type: string }>,
};


/** The unauthenticated `/info` API, shared by the Market and Account nodes. Reads only —
 *  account calls are keyed by wallet address and need no key, so nothing here is privileged. */
export class HyperLiquidPublicClient {

    private readonly http: HTTP.Client;

    constructor(http: HTTP.ClientAPI) {
        this.http = http.create({
            vendor:  "HyperLiquid",
            baseURL: HYPERLIQUID_INFO_URL,
            headers: { "Content-Type": "application/json" },
        });
    }


    // Every read is a POST to the same endpoint, discriminated by `type`.
    private post<T>(payload: Record<string, unknown>): Promise<T> {
        return this.http.post<T>("", payload);
    }


    candles(coin: string, interval: string, lookbackHours: number): Promise<Candle[]> {

        const endTime   = Date.now();
        const startTime = endTime - lookbackHours * 60 * 60 * 1000;

        return this.post<Candle[]>({
            type: "candleSnapshot",
            req: { coin, interval, startTime, endTime },
        });
    }


    mids(): Promise<Record<string, string>> {
        return this.post<Record<string, string>>({ type: "allMids" });
    }


    orderBook(coin: string): Promise<unknown> {
        return this.post<unknown>({ type: "l2Book", coin });
    }


    meta(): Promise<unknown> {
        return this.post<unknown>({ type: "metaAndAssetCtxs" });
    }


    clearinghouseState(user: string): Promise<ClearinghouseState> {
        return this.post<ClearinghouseState>({ type: "clearinghouseState", user });
    }


    openOrders(user: string): Promise<unknown[]> {
        return this.post<unknown[]>({ type: "openOrders", user });
    }


    userFills(user: string): Promise<unknown[]> {
        return this.post<unknown[]>({ type: "userFills", user });
    }


    userFunding(user: string, startTime: number): Promise<unknown[]> {
        return this.post<unknown[]>({ type: "userFunding", user, startTime });
    }
}
