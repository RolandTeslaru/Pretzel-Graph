import type { HTTP } from "@pretzel-graph/node-sdk";
import type { z } from "zod";

import { HyperLiquid } from "../domain";


export const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";


type CandleArgs = {
    coin:      string;
    interval:  HyperLiquid.API.CandleInterval;
    startTime: number;
    endTime?:  number;
};

type BookArgs = {
    coin:       string;
    depth?:     number;
    nSigFigs?:  2 | 3 | 4 | 5 | null;
    mantissa?:  1 | 2 | 5;
};

type UserArgs = {
    user: string;
    dex?: string;
};

type TimeRangeArgs = {
    user:       string;
    startTime:  number;
    endTime?:   number;
    maxResults?: number;
};


/**
 * The one public Hyperliquid transport seam.
 *
 * Every read is a POST to `/info`; the payload's `type` selects the operation. Methods validate
 * the wire response and return PretzelGraph domain objects, so nodes and tools never depend on raw
 * one-letter candle keys or unchecked `unknown` values.
 */
export class HyperLiquidInfoClient {

    readonly #http: HTTP.Client;

    constructor(http: HTTP.ClientAPI) {
        this.#http = http.create({
            vendor:  "HyperLiquid",
            baseURL: HYPERLIQUID_INFO_URL,
            headers: { "Content-Type": "application/json" },
        });
    }


    async #post<TSchema extends z.ZodType>(
        payload: Record<string, unknown>,
        schema: TSchema,
    ): Promise<z.output<TSchema>> {
        const response = await this.#http.post<unknown>("", payload);
        return schema.parse(response);
    }


    static #required(value: string, name: string): string {
        const text = value.trim();

        if (!text)
            throw new Error(`Hyperliquid: '${name}' is required.`);

        return text;
    }

    static #address(value: string): string {
        const address = value.trim();
        const parsed  = HyperLiquid.API.Address.safeParse(address);

        if (!parsed.success)
            throw new Error(`Hyperliquid: invalid wallet address '${address}'. Expected an EVM 0x-prefixed 40-hex address.`);

        return parsed.data.toLowerCase();
    }

    static #dex(value?: string): string {
        return value?.trim() ?? "";
    }


    public async candles(args: CandleArgs): Promise<HyperLiquid.Candle[]> {
        const coin    = HyperLiquidInfoClient.#required(args.coin, "coin");
        const interval = HyperLiquid.API.CandleInterval.parse(args.interval);
        const endTime = args.endTime ?? Date.now();

        if (!Number.isSafeInteger(args.startTime) || !Number.isSafeInteger(endTime) || args.startTime >= endTime)
            throw new Error("Hyperliquid: candle startTime must be an integer before endTime.");

        const response = await this.#post({
            type: "candleSnapshot",
            req: { coin, interval, startTime: args.startTime, endTime },
        }, HyperLiquid.API.CandleSnapshot);

        return response.map(HyperLiquid.Candle.fromAPI);
    }


    public async mids(args: { dex?: string } = {}): Promise<HyperLiquid.Mid[]> {
        const dex = HyperLiquidInfoClient.#dex(args.dex);
        const response = await this.#post({
            type: "allMids",
            ...(dex ? { dex } : {}),
        }, HyperLiquid.API.AllMids);

        return HyperLiquid.Mid.fromAPI(response);
    }


    public async orderBook(args: BookArgs): Promise<HyperLiquid.OrderBook> {
        const coin  = HyperLiquidInfoClient.#required(args.coin, "coin");
        const depth = Math.min(Math.max(Math.trunc(args.depth ?? HyperLiquid.OrderBook.DEFAULT_DEPTH), 1), 20);

        if (args.mantissa !== undefined && args.nSigFigs !== 5)
            throw new Error("Hyperliquid: mantissa is only valid when nSigFigs is 5.");

        const response = await this.#post({
            type: "l2Book",
            coin,
            ...(args.nSigFigs !== undefined ? { nSigFigs: args.nSigFigs } : {}),
            ...(args.mantissa !== undefined ? { mantissa: args.mantissa } : {}),
        }, HyperLiquid.API.OrderBook);

        return HyperLiquid.OrderBook.fromAPI(response, depth);
    }


    public async perpetualMarkets(args: { dex?: string } = {}): Promise<HyperLiquid.Market[]> {
        const dex = HyperLiquidInfoClient.#dex(args.dex);
        const response = await this.#post({
            type: "metaAndAssetCtxs",
            ...(dex ? { dex } : {}),
        }, HyperLiquid.API.PerpetualMetaAndAssetContexts);

        return HyperLiquid.Market.perpetualsFromAPI(dex, response)
            .sort((left, right) => Number(right.dayNotionalVolume) - Number(left.dayNotionalVolume));
    }


    public async spotMarkets(): Promise<HyperLiquid.Market[]> {
        const response = await this.#post(
            { type: "spotMetaAndAssetCtxs" },
            HyperLiquid.API.SpotMetaAndAssetContexts,
        );

        return HyperLiquid.Market.spotsFromAPI(response)
            .sort((left, right) => Number(right.dayNotionalVolume) - Number(left.dayNotionalVolume));
    }


    public async accountState(args: UserArgs): Promise<{
        state:     z.infer<typeof HyperLiquid.Account.State>;
        positions: z.infer<typeof HyperLiquid.Account.Position>[];
    }> {
        const user = HyperLiquidInfoClient.#address(args.user);
        const dex  = HyperLiquidInfoClient.#dex(args.dex);
        const response = await this.#post({
            type: "clearinghouseState",
            user,
            ...(dex ? { dex } : {}),
        }, HyperLiquid.API.ClearinghouseState);

        return {
            state:     HyperLiquid.Account.stateFromAPI(dex, response),
            positions: HyperLiquid.Account.positionsFromAPI(response),
        };
    }


    public async spotBalances(userValue: string): Promise<z.infer<typeof HyperLiquid.Account.SpotBalance>[]> {
        const user = HyperLiquidInfoClient.#address(userValue);
        const response = await this.#post(
            { type: "spotClearinghouseState", user },
            HyperLiquid.API.SpotClearinghouseState,
        );

        return response.balances;
    }


    public async openOrders(args: UserArgs): Promise<z.infer<typeof HyperLiquid.Account.OpenOrder>[]> {
        const user = HyperLiquidInfoClient.#address(args.user);
        const dex  = HyperLiquidInfoClient.#dex(args.dex);

        return this.#post({
            type: "openOrders",
            user,
            ...(dex ? { dex } : {}),
        }, HyperLiquid.API.OpenOrders);
    }


    public async fills(args: TimeRangeArgs & { aggregateByTime?: boolean }): Promise<z.infer<typeof HyperLiquid.Account.Fill>[]> {
        const user       = HyperLiquidInfoClient.#address(args.user);
        const endTime    = args.endTime ?? Date.now();
        const maxResults = Math.min(Math.max(Math.trunc(args.maxResults ?? 100), 1), 2_000);

        const fills = await this.#post({
            type: "userFillsByTime",
            user,
            startTime: args.startTime,
            endTime,
            aggregateByTime: args.aggregateByTime ?? true,
        }, HyperLiquid.API.Fills);

        return fills.slice(0, maxResults);
    }


    public async funding(args: TimeRangeArgs): Promise<z.infer<typeof HyperLiquid.Account.FundingPayment>[]> {
        const user       = HyperLiquidInfoClient.#address(args.user);
        const endTime    = args.endTime ?? Date.now();
        const maxResults = Math.min(Math.max(Math.trunc(args.maxResults ?? 100), 1), 500);

        const payments = await this.#post({
            type: "userFunding",
            user,
            startTime: args.startTime,
            endTime,
        }, HyperLiquid.API.FundingPayments);

        return payments.slice(0, maxResults);
    }
}
