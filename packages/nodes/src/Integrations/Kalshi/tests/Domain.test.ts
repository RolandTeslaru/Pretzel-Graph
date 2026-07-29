import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type {
    MarketCandlestick,
    MarketCandlestickHistorical,
} from "kalshi-typescript"

import { Kalshi } from "../domain"
import { market } from "./fixtures"


describe("Kalshi domain", () => {

    it("maps the generated market into a smaller stable shape", () => {
        const mapped = Kalshi.Market.fromAPI(market({
            title:             "Deprecated market title",
            subtitle:          "Deprecated subtitle",
            liquidity_dollars: "0.0000",
        }))

        assert.equal(Kalshi.Market.Schema.safeParse(mapped).success, true)
        assert.equal(mapped.ticker, "KXTEST-26-YES")
        assert.equal(mapped.yesBid, "0.4200")
        assert.equal(mapped.volume, "1200.50")
        assert.equal("title" in mapped, false)
        assert.equal("liquidity" in mapped, false)
    })


    it("normalizes Kalshi's two bid books into four best-first sides", () => {
        const book = Kalshi.OrderBook.fromAPI(
            "KXTEST-26-YES",
            {
                yes_dollars: [
                    ["0.3000", "4.00"],
                    ["0.4200", "10.00"],
                ],
                no_dollars: [
                    ["0.5500", "8.00"],
                    ["0.5000", "2.00"],
                ],
            },
            10,
        )

        assert.equal(Kalshi.OrderBook.Schema.safeParse(book).success, true)
        assert.deepEqual(book.yesBids.map(level => level.price), ["0.4200", "0.3000"])
        assert.deepEqual(book.yesAsks.map(level => level.price), ["0.4500", "0.5000"])
        assert.deepEqual(book.noAsks.map(level => level.price), ["0.5800", "0.7000"])
        assert.equal(book.bestYesBid, "0.4200")
        assert.equal(book.bestYesAsk, "0.4500")
        assert.equal(book.yesSpread, "0.0300")
    })


    it("maps live and historical candlesticks into the same shape", () => {
        const live = {
            end_period_ts: 1_700_000_000,
            yes_bid: {
                open_dollars:  "0.4000",
                low_dollars:   "0.3900",
                high_dollars:  "0.4300",
                close_dollars: "0.4200",
            },
            yes_ask: {
                open_dollars:  "0.4200",
                low_dollars:   "0.4100",
                high_dollars:  "0.4500",
                close_dollars: "0.4400",
            },
            price: {
                open_dollars:  "0.4100",
                low_dollars:   "0.4000",
                high_dollars:  "0.4400",
                close_dollars: "0.4300",
            },
            volume_fp:        "10.00",
            open_interest_fp: "100.00",
        } satisfies MarketCandlestick

        const historical = {
            end_period_ts: 1_700_000_000,
            yes_bid: { open: "0.4000", low: "0.3900", high: "0.4300", close: "0.4200" },
            yes_ask: { open: "0.4200", low: "0.4100", high: "0.4500", close: "0.4400" },
            price: {
                open: "0.4100",
                low: "0.4000",
                high: "0.4400",
                close: "0.4300",
                mean: "0.4250",
                previous: "0.4000",
            },
            volume:        "10.00",
            open_interest: "100.00",
        } satisfies MarketCandlestickHistorical

        const common = {
            ticker:  "KXTEST-26-YES",
            interval: 60 as const,
            startTs: 1_699_999_000,
            endTs:   1_700_000_000,
        }

        const liveMapped = Kalshi.PriceHistory.fromLive({
            ...common,
            candlesticks: [live],
        })
        const historicalMapped = Kalshi.PriceHistory.fromHistorical({
            ...common,
            candlesticks: [historical],
        })

        assert.equal(Kalshi.PriceHistory.Schema.safeParse(liveMapped).success, true)
        assert.equal(Kalshi.PriceHistory.Schema.safeParse(historicalMapped).success, true)
        assert.deepEqual(liveMapped.history, historicalMapped.history)
        assert.equal(liveMapped.source, "live")
        assert.equal(historicalMapped.source, "historical")
    })
})
