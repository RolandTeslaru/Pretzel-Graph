import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { Polymarket } from "../domain"

describe("Polymarket CLOB API requests", () => {
    it("defaults empty and cursor requests", () => {
        assert.deepEqual(
            Polymarket.CLOB.API.System.Status.Request.parse(undefined),
            {},
        )
        assert.deepEqual(
            Polymarket.CLOB.API.Markets.List.Request.parse(undefined),
            {},
        )
        assert.deepEqual(
            Polymarket.CLOB.API.Orders.ListOpen.Request.parse(undefined),
            {},
        )
    })

    it("validates order-book sides and positive calculated amounts", () => {
        const PriceRequest =
            Polymarket.CLOB.API.MarketData.GetPrice.Request
        const CalculationRequest =
            Polymarket.CLOB.API.MarketData.CalculateMarketPrice.Request

        assert.equal(
            PriceRequest.safeParse({
                token_id: "token",
                side:     "HOLD",
            }).success,
            false,
        )
        assert.equal(
            CalculationRequest.safeParse({
                token_id: "token",
                side:     "BUY",
                amount:   0,
            }).success,
            false,
        )
        assert.equal(
            CalculationRequest.safeParse({
                token_id:  "token",
                side:      "BUY",
                amount:    10,
                order_type: "FOK",
            }).success,
            true,
        )
    })

    it("validates authentication nonces and balance asset types", () => {
        assert.equal(
            Polymarket.CLOB.API.Authentication.CreateApiKey.Request
                .safeParse({ nonce: -1 }).success,
            false,
        )
        assert.equal(
            Polymarket.CLOB.API.Balances.GetAllowance.Request.safeParse({
                asset_type: "UNKNOWN",
            }).success,
            false,
        )
        assert.equal(
            Polymarket.CLOB.API.Balances.GetAllowance.Request.safeParse({
                asset_type: "COLLATERAL",
            }).success,
            true,
        )
    })

    it("separates limit and market order types", () => {
        const LimitOrder =
            Polymarket.CLOB.API.Orders.CreateAndPost.Request
        const MarketOrder =
            Polymarket.CLOB.API.Orders.CreateAndPostMarket.Request

        const order = {
            tokenID: "token",
            price:   0.5,
            size:    10,
            side:    "BUY" as const,
        }
        const marketOrder = {
            tokenID: "token",
            amount:  10,
            side:    "BUY" as const,
        }

        assert.equal(
            LimitOrder.safeParse({
                order,
                order_type: "FOK",
            }).success,
            false,
        )
        assert.equal(
            MarketOrder.safeParse({
                order:      marketOrder,
                order_type: "FOK",
            }).success,
            true,
        )
    })
})

describe("Polymarket CLOB API responses", () => {
    it("accepts an empty last-trade side when no trade exists", () => {
        assert.equal(
            Polymarket.CLOB.API.MarketData.GetLastTradePrice.Response
                .safeParse({
                    price: "0.5",
                    side:  "",
                }).success,
            true,
        )
    })

    it("requires complete API credentials", () => {
        const Response =
            Polymarket.CLOB.API.Authentication.CreateApiKey.Response

        assert.equal(
            Response.safeParse({
                key:        "key",
                secret:     "secret",
                passphrase: "passphrase",
            }).success,
            true,
        )
        assert.equal(
            Response.safeParse({
                key:    "key",
                secret: "secret",
            }).success,
            false,
        )
    })

    it("validates order cancellation maps", () => {
        const Response =
            Polymarket.CLOB.API.Orders.Cancel.Response

        assert.equal(
            Response.safeParse({
                canceled:     ["order-1"],
                not_canceled: {
                    "order-2": "already filled",
                },
            }).success,
            true,
        )
        assert.equal(
            Response.safeParse({
                canceled:     "order-1",
                not_canceled: {},
            }).success,
            false,
        )
    })

    it("preserves unknown fields on order books", () => {
        const response =
            Polymarket.CLOB.API.MarketData.GetOrderBook.Response.parse({
                market:           "condition",
                asset_id:         "token",
                timestamp:        "1",
                hash:             "hash",
                bids:             [],
                asks:             [],
                min_order_size:   "1",
                tick_size:        "0.01",
                neg_risk:         false,
                last_trade_price: null,
                futureField:      "preserved",
            })

        assert.equal(response.futureField, "preserved")
    })
})
