import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HyperLiquid } from "../domain";
import {
    candle,
    orderBook,
    perpetualMeta,
    spotMeta,
} from "./fixtures";


describe("Hyperliquid domain", () => {

    it("normalizes one candle without inventing a summary wrapper", () => {
        const normalized = HyperLiquid.Candle.fromAPI(
            HyperLiquid.API.Candle.parse(candle()),
        );

        assert.deepEqual(normalized, {
            openTime: 1_000, closeTime: 1_999, coin: "BTC", interval: "1h",
            open: "100.0", close: "110.0", high: "115.0", low: "95.0",
            volume: "12.5", trades: 42,
        });
    });


    it("sorts order-book sides best first and applies depth", () => {
        const normalized = HyperLiquid.OrderBook.fromAPI(
            HyperLiquid.API.OrderBook.parse(orderBook()),
            1,
        );

        assert.deepEqual(normalized.bids.map(level => level.price), ["100.0"]);
        assert.deepEqual(normalized.asks.map(level => level.price), ["101.0"]);
        assert.equal(normalized.bidLevels, 2);
        assert.equal(normalized.askLevels, 2);
        assert.equal(normalized.spread, 1);
    });


    it("joins perpetual and Spot metadata with their asset contexts", () => {
        const perps = HyperLiquid.Market.perpetualsFromAPI(
            "xyz",
            HyperLiquid.API.PerpetualMetaAndAssetContexts.parse(perpetualMeta()),
        );
        const spots = HyperLiquid.Market.spotsFromAPI(
            HyperLiquid.API.SpotMetaAndAssetContexts.parse(spotMeta()),
        );

        assert.equal(perps[0].kind, "perpetual");
        assert.equal(perps[0].dex, "xyz");
        assert.equal(perps[0].markPrice, "100");
        assert.equal(spots[0].kind, "spot");
        assert.equal(spots[0].baseToken, "PURR");
        assert.equal(spots[0].quoteToken, "USDC");
    });


    it("rejects drifted wire responses instead of returning unchecked unknown", () => {
        assert.equal(HyperLiquid.API.OrderBook.safeParse({ coin: "BTC", levels: [] }).success, false);
        assert.equal(HyperLiquid.API.CandleSnapshot.safeParse([{ bad: true }]).success, false);
    });
});
