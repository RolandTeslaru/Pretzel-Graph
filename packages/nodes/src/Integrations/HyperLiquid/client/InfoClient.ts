import { HTTP } from "@pretzel-graph/node-sdk";
import type { z } from "zod";

import { HyperLiquid } from "../domain";


export const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";

/**
 * The accepted coin id forms, worded for whoever has to correct a bad one — a user reading a
 * field tooltip or a model retrying a tool call.
 */
export const COIN_ID_FORMS =
    "Perpetuals use the bare uppercase base ticker (BTC, ETH, HYPE). "
    + "Spot uses the @index id (@107); PURR/USDC is the one pair name that also resolves. "
    + "HIP-3 markets use dex:coin. "
    + "Exchange-style pair ids such as BTC/USD, BTC/USDC or BTCUSDT are not valid here.";


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


    /**
     * A coin-scoped read. Hyperliquid reports an unknown coin two different ways — a bodiless 500
     * on `candleSnapshot`, a null 200 on `l2Book` — and neither names the coin, so both surface as
     * one message that says which id failed and what a valid one looks like.
     *
     * That bodiless 500 is permanent, so it opts out of the retry loop; a 500 that carries a body
     * is a real server fault and still retries.
     */
    async #postForCoin<TSchema extends z.ZodType>(
        coin: string,
        payload: Record<string, unknown>,
        schema: TSchema,
    ): Promise<z.output<TSchema>> {

        let response: unknown;

        try {
            response = await this.#http.post<unknown>("", payload, {
                retryable: (status, body) => !(status === 500 && body == null),
            });
        }
        catch (error) {

            if (error instanceof HTTP.Error && error.status === 500 && error.body == null)
                throw HyperLiquidInfoClient.#unknownCoin(coin);

            throw error;
        }

        if (response == null)
            throw HyperLiquidInfoClient.#unknownCoin(coin);

        return schema.parse(response);
    }


    static #unknownCoin(coin: string): Error {
        return new Error(`Hyperliquid: unknown coin '${coin}'. ${COIN_ID_FORMS}`);
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

        const response = await this.#postForCoin(coin, {
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

        const response = await this.#postForCoin(coin, {
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
