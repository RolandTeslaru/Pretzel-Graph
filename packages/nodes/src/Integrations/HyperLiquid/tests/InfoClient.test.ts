import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HTTP } from "@pretzel-graph/node-sdk";

import {
    HYPERLIQUID_INFO_URL,
    HyperLiquidInfoClient,
} from "../client";
import { HTTPMock } from "./HTTPMock";
import {
    candle,
    clearinghouseState,
    orderBook,
    perpetualMeta,
    spotMeta,
} from "./fixtures";


const ADDRESS = "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD";


describe("HyperLiquidInfoClient", () => {

    it("uses one shared info client and validates candle responses", async () => {
        const http = new HTTPMock({ candleSnapshot: [candle()] });
        const client = new HyperLiquidInfoClient(http.api);

        const candles = await client.candles({
            coin: " BTC ", interval: "1h", startTime: 1_000, endTime: 2_000,
        });

        assert.equal(http.config?.baseURL, HYPERLIQUID_INFO_URL);
        assert.equal(http.config?.vendor, "HyperLiquid");
        assert.deepEqual(http.calls[0], {
            path: "",
            payload: {
                type: "candleSnapshot",
                req: { coin: "BTC", interval: "1h", startTime: 1_000, endTime: 2_000 },
            },
        });
        assert.equal(candles[0].open, "100.0");
    });


    it("normalizes books and sends HIP-3 DEX selectors only where supported", async () => {
        const http = new HTTPMock({
            l2Book: orderBook(),
            metaAndAssetCtxs: perpetualMeta(),
        });
        const client = new HyperLiquidInfoClient(http.api);

        const book = await client.orderBook({ coin: "BTC", depth: 1 });
        const markets = await client.perpetualMarkets({ dex: " xyz " });

        assert.equal(book.bestBid, "100.0");
        assert.equal(markets[0].coin, "ETH");
        assert.deepEqual(http.calls[1].payload, { type: "metaAndAssetCtxs", dex: "xyz" });
    });


    it("supports Spot metadata and account balances through the same endpoint", async () => {
        const http = new HTTPMock({
            spotMetaAndAssetCtxs: spotMeta(),
            clearinghouseState: clearinghouseState(),
            spotClearinghouseState: {
                balances: [{ coin: "USDC", token: 0, total: "5", hold: "1", entryNtl: "5" }],
            },
        });
        const client = new HyperLiquidInfoClient(http.api);

        const markets = await client.spotMarkets();
        const account = await client.accountState({ user: ADDRESS, dex: "xyz" });
        const balances = await client.spotBalances(ADDRESS);

        assert.equal(markets[0].coin, "PURR/USDC");
        assert.equal(account.state.dex, "xyz");
        assert.equal(balances[0].coin, "USDC");
        assert.equal(http.calls[1].payload.user, ADDRESS.toLowerCase());
    });


    it("names the coin when candles come back as a bodiless 500", async () => {
        const http = new HTTPMock({
            candleSnapshot: () => {
                throw new HTTP.Error(
                    "HyperLiquid request failed: POST  -> 500 Internal Server Error.",
                    "HyperLiquid", "POST", "", 500, null,
                );
            },
        });
        const client = new HyperLiquidInfoClient(http.api);

        await assert.rejects(
            () => client.candles({ coin: "BTC/USD", interval: "1h", startTime: 1_000, endTime: 2_000 }),
            /unknown coin 'BTC\/USD'.*BTC\/USDC or BTCUSDT are not valid/s,
        );
    });


    it("names the coin when the order book comes back null", async () => {
        const http = new HTTPMock({ l2Book: null });
        const client = new HyperLiquidInfoClient(http.api);

        await assert.rejects(
            () => client.orderBook({ coin: "HYPE/USDC" }),
            /unknown coin 'HYPE\/USDC'/,
        );
    });


    it("leaves unrelated transport failures untouched", async () => {
        const http = new HTTPMock({
            l2Book: () => {
                throw new HTTP.Error("HyperLiquid rate limited.", "HyperLiquid", "POST", "", 429, { error: "429" });
            },
        });
        const client = new HyperLiquidInfoClient(http.api);

        await assert.rejects(() => client.orderBook({ coin: "BTC" }), /rate limited/);
    });


    it("fails before transport for invalid addresses", async () => {
        const client = new HyperLiquidInfoClient(new HTTPMock({}).api);

        await assert.rejects(
            () => client.accountState({ user: "0x123" }),
            /invalid wallet address/,
        );
    });
});
