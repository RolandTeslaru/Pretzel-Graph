import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { Alpaca as OfficialAlpaca } from "@alpacahq/alpaca-trade-api/rest"
import { mockFetch, type MockRoute } from "@alpacahq/alpaca-trade-api/testing"

import {
    AlpacaAccountService,
    AlpacaMarketService,
    AlpacaTradingService,
} from "../services"


const client = (routes: MockRoute[], paper: boolean = true) =>
    new OfficialAlpaca({
        keyId:    "test-key",
        secret:   "test-secret",
        paper,
        fetchApi: mockFetch(routes),
        retry:    false,
        rateLimit: false,
    })


describe("Alpaca services over the official client", () => {

    it("uses the generated asset and normalized bars APIs", async () => {
        const market = new AlpacaMarketService(client([
            {
                method: "GET",
                path:   "/v2/assets",
                body: [{
                    id:             "asset-1",
                    class:          "us_equity",
                    exchange:       "NASDAQ",
                    symbol:         "AAPL",
                    name:           "Apple Inc.",
                    status:         "active",
                    tradable:       true,
                    marginable:     true,
                    shortable:      true,
                    easy_to_borrow: true,
                    fractionable:   true,
                }],
            },
            {
                method: "GET",
                path:   "/v2/stocks/bars",
                body: {
                    bars: {
                        AAPL: [{
                            t:  "2026-08-01T12:00:00.123456789Z",
                            o:  200,
                            h:  205,
                            l:  199,
                            c:  204,
                            v:  1_000,
                            vw: 202.5,
                            n:  40,
                        }],
                    },
                    next_page_token: null,
                },
            },
        ]))

        const assets = await market.assets.list({ query: "apple", limit: 5 })
        const bars   = await market.bars({
            assetClass: "stock",
            symbol:     "AAPL",
            unit:       "hour",
            limit:      5,
        })

        assert.equal(assets[0].symbol, "AAPL")
        assert.equal(assets[0].assetClass, "us_equity")
        assert.equal(bars[0].symbol, "AAPL")
        assert.equal(bars[0].close, 204)
        assert.equal(bars[0].timestampRaw, "2026-08-01T12:00:00.123456789Z")
    })


    it("compacts account and position models without losing fixed-point values", async () => {
        const account = new AlpacaAccountService(client([
            {
                method: "GET",
                path:   "/v2/account",
                body: {
                    id:              "account-1",
                    status:          "ACTIVE",
                    currency:        "USD",
                    cash:            "1200.50",
                    equity:          "2500.75",
                    buying_power:    "2401.00",
                    trading_blocked: false,
                },
            },
            {
                method: "GET",
                path:   "/v2/positions",
                body: [{
                    asset_id:                 "asset-1",
                    symbol:                   "AAPL",
                    exchange:                 "NASDAQ",
                    asset_class:              "us_equity",
                    asset_marginable:         true,
                    qty:                      "2.5",
                    qty_available:            "2.5",
                    avg_entry_price:          "190.00",
                    side:                     "long",
                    market_value:             "510.00",
                    cost_basis:               "475.00",
                    unrealized_pl:            "35.00",
                    unrealized_plpc:          "0.073684",
                    unrealized_intraday_pl:   "5.00",
                    unrealized_intraday_plpc: "0.0099",
                    current_price:            "204.00",
                    lastday_price:            "202.00",
                    change_today:             "0.0099",
                }],
            },
        ]))

        const summary   = await account.summary()
        const positions = await account.positions.list()

        assert.equal(summary.cash, "1200.50")
        assert.equal(summary.tradingBlocked, false)
        assert.equal(positions[0].quantity, "2.5")
        assert.equal(positions[0].unrealizedProfit, "35.00")
    })


    it("submits through the official ergonomic order builder", async () => {
        let requestBody = ""
        const trading = new AlpacaTradingService(client([
            {
                method: "POST",
                path:   "/v2/orders",
                respond: request => {
                    requestBody = String(request.init?.body ?? "")
                    return {
                        id:              "order-1",
                        client_order_id: "pretzel-1",
                        symbol:          "AAPL",
                        asset_class:     "us_equity",
                        side:            "buy",
                        type:            "limit",
                        time_in_force:   "day",
                        qty:             "2",
                        notional:        null,
                        filled_qty:      "0",
                        limit_price:     "200",
                        status:          "accepted",
                    }
                },
            },
        ]))

        const order = await trading.submit({
            type:          "limit",
            symbol:        "AAPL",
            side:          "buy",
            quantity:      2,
            limitPrice:    200,
            clientOrderId: "pretzel-1",
        })

        assert.equal(order.id, "order-1")
        assert.equal(order.limitPrice, "200")
        assert.match(requestBody, /"limit_price":"200"/)
        assert.match(requestBody, /"qty":"2"/)
    })


    it("requires a fresh confirmation before every live mutation", async () => {
        const trading = new AlpacaTradingService(client([], false))

        await assert.rejects(
            () => trading.cancel("order-1"),
            /confirmLive=true/,
        )
        await assert.rejects(
            () => trading.submit({
                type:      "market",
                symbol:    "AAPL",
                side:      "buy",
                quantity:  1,
            }),
            /confirmLive=true/,
        )
    })


    it("preserves partial results from bulk mutations", async () => {
        const trading = new AlpacaTradingService(client([{
            method: "DELETE",
            path:   "/v2/orders",
            body: [
                { id: "order-1", status: 204 },
                { id: "order-2", status: 500 },
            ],
        }]))

        const result = await trading.cancelAll()

        assert.equal(result.succeeded, false)
        assert.deepEqual(result.results, [
            { target: "order-1", status: 204, succeeded: true,  order: null },
            { target: "order-2", status: 500, succeeded: false, order: null },
        ])
    })
})
