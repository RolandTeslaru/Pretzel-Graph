"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperLiquidInfoClient = exports.COIN_ID_FORMS = exports.HYPERLIQUID_INFO_URL = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const domain_1 = require("../domain");
exports.HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
/**
 * The accepted coin id forms, worded for whoever has to correct a bad one — a user reading a
 * field tooltip or a model retrying a tool call.
 */
exports.COIN_ID_FORMS = "Perpetuals use the bare uppercase base ticker (BTC, ETH, HYPE). "
    + "Spot uses the @index id (@107); PURR/USDC is the one pair name that also resolves. "
    + "HIP-3 markets use dex:coin. "
    + "Exchange-style pair ids such as BTC/USD, BTC/USDC or BTCUSDT are not valid here.";
/**
 * The one public Hyperliquid transport seam.
 *
 * Every read is a POST to `/info`; the payload's `type` selects the operation. Methods validate
 * the wire response and return PretzelGraph domain objects, so nodes and tools never depend on raw
 * one-letter candle keys or unchecked `unknown` values.
 */
class HyperLiquidInfoClient {
    #http;
    constructor(http) {
        this.#http = http.create({
            vendor: "HyperLiquid",
            baseURL: exports.HYPERLIQUID_INFO_URL,
            headers: { "Content-Type": "application/json" },
        });
    }
    async #post(payload, schema) {
        const response = await this.#http.post("", payload);
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
    async #postForCoin(coin, payload, schema) {
        let response;
        try {
            response = await this.#http.post("", payload, {
                retryable: (status, body) => !(status === 500 && body == null),
            });
        }
        catch (error) {
            if (error instanceof node_sdk_1.HTTP.Error && error.status === 500 && error.body == null)
                throw _a.#unknownCoin(coin);
            throw error;
        }
        if (response == null)
            throw _a.#unknownCoin(coin);
        return schema.parse(response);
    }
    static #unknownCoin(coin) {
        return new Error(`Hyperliquid: unknown coin '${coin}'. ${exports.COIN_ID_FORMS}`);
    }
    static #required(value, name) {
        const text = value.trim();
        if (!text)
            throw new Error(`Hyperliquid: '${name}' is required.`);
        return text;
    }
    static #address(value) {
        const address = value.trim();
        const parsed = domain_1.HyperLiquid.API.Address.safeParse(address);
        if (!parsed.success)
            throw new Error(`Hyperliquid: invalid wallet address '${address}'. Expected an EVM 0x-prefixed 40-hex address.`);
        return parsed.data.toLowerCase();
    }
    static #dex(value) {
        return value?.trim() ?? "";
    }
    async candles(args) {
        const coin = _a.#required(args.coin, "coin");
        const interval = domain_1.HyperLiquid.API.CandleInterval.parse(args.interval);
        const endTime = args.endTime ?? Date.now();
        if (!Number.isSafeInteger(args.startTime) || !Number.isSafeInteger(endTime) || args.startTime >= endTime)
            throw new Error("Hyperliquid: candle startTime must be an integer before endTime.");
        const response = await this.#postForCoin(coin, {
            type: "candleSnapshot",
            req: { coin, interval, startTime: args.startTime, endTime },
        }, domain_1.HyperLiquid.API.CandleSnapshot);
        return response.map(domain_1.HyperLiquid.Candle.fromAPI);
    }
    async mids(args = {}) {
        const dex = _a.#dex(args.dex);
        const response = await this.#post({
            type: "allMids",
            ...(dex ? { dex } : {}),
        }, domain_1.HyperLiquid.API.AllMids);
        return domain_1.HyperLiquid.Mid.fromAPI(response);
    }
    async orderBook(args) {
        const coin = _a.#required(args.coin, "coin");
        const depth = Math.min(Math.max(Math.trunc(args.depth ?? domain_1.HyperLiquid.OrderBook.DEFAULT_DEPTH), 1), 20);
        if (args.mantissa !== undefined && args.nSigFigs !== 5)
            throw new Error("Hyperliquid: mantissa is only valid when nSigFigs is 5.");
        const response = await this.#postForCoin(coin, {
            type: "l2Book",
            coin,
            ...(args.nSigFigs !== undefined ? { nSigFigs: args.nSigFigs } : {}),
            ...(args.mantissa !== undefined ? { mantissa: args.mantissa } : {}),
        }, domain_1.HyperLiquid.API.OrderBook);
        return domain_1.HyperLiquid.OrderBook.fromAPI(response, depth);
    }
    async perpetualMarkets(args = {}) {
        const dex = _a.#dex(args.dex);
        const response = await this.#post({
            type: "metaAndAssetCtxs",
            ...(dex ? { dex } : {}),
        }, domain_1.HyperLiquid.API.PerpetualMetaAndAssetContexts);
        return domain_1.HyperLiquid.Market.perpetualsFromAPI(dex, response)
            .sort((left, right) => Number(right.dayNotionalVolume) - Number(left.dayNotionalVolume));
    }
    async spotMarkets() {
        const response = await this.#post({ type: "spotMetaAndAssetCtxs" }, domain_1.HyperLiquid.API.SpotMetaAndAssetContexts);
        return domain_1.HyperLiquid.Market.spotsFromAPI(response)
            .sort((left, right) => Number(right.dayNotionalVolume) - Number(left.dayNotionalVolume));
    }
    async accountState(args) {
        const user = _a.#address(args.user);
        const dex = _a.#dex(args.dex);
        const response = await this.#post({
            type: "clearinghouseState",
            user,
            ...(dex ? { dex } : {}),
        }, domain_1.HyperLiquid.API.ClearinghouseState);
        return {
            state: domain_1.HyperLiquid.Account.stateFromAPI(dex, response),
            positions: domain_1.HyperLiquid.Account.positionsFromAPI(response),
        };
    }
    async spotBalances(userValue) {
        const user = _a.#address(userValue);
        const response = await this.#post({ type: "spotClearinghouseState", user }, domain_1.HyperLiquid.API.SpotClearinghouseState);
        return response.balances;
    }
    async openOrders(args) {
        const user = _a.#address(args.user);
        const dex = _a.#dex(args.dex);
        return this.#post({
            type: "openOrders",
            user,
            ...(dex ? { dex } : {}),
        }, domain_1.HyperLiquid.API.OpenOrders);
    }
    async fills(args) {
        const user = _a.#address(args.user);
        const endTime = args.endTime ?? Date.now();
        const maxResults = Math.min(Math.max(Math.trunc(args.maxResults ?? 100), 1), 2_000);
        const fills = await this.#post({
            type: "userFillsByTime",
            user,
            startTime: args.startTime,
            endTime,
            aggregateByTime: args.aggregateByTime ?? true,
        }, domain_1.HyperLiquid.API.Fills);
        return fills.slice(0, maxResults);
    }
    async funding(args) {
        const user = _a.#address(args.user);
        const endTime = args.endTime ?? Date.now();
        const maxResults = Math.min(Math.max(Math.trunc(args.maxResults ?? 100), 1), 500);
        const payments = await this.#post({
            type: "userFunding",
            user,
            startTime: args.startTime,
            endTime,
        }, domain_1.HyperLiquid.API.FundingPayments);
        return payments.slice(0, maxResults);
    }
}
exports.HyperLiquidInfoClient = HyperLiquidInfoClient;
_a = HyperLiquidInfoClient;
