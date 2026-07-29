import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
    KalshiPublicSDK,
    type KalshiPublicAPIs,
} from "../sdk/publicSDK"
import { event, market, series, trade } from "./fixtures"


const response = <T>(data: T) => Promise.resolve({ data } as never)

const publicAPIs = (
    overrides: Partial<KalshiPublicAPIs> = {},
): KalshiPublicAPIs => ({
    events: {
        getEvent: async () => response({ event: event(), markets: [] }),
        getEvents: async () => response({ events: [event()], cursor: "" }),
    },
    exchange: {
        getExchangeStatus: async () => response({
            exchange_active: true,
            trading_active: true,
        }),
    },
    historical: {
        getHistoricalMarket: async ticker => response({
            market: market({ ticker, status: "finalized" }),
        }),
        getHistoricalMarkets: async () => response({ markets: [], cursor: "" }),
        getMarketCandlesticksHistorical: async ticker => response({
            ticker,
            candlesticks: [],
        }),
        getTradesHistorical: async () => response({ trades: [], cursor: "" }),
    },
    markets: {
        getMarket: async ticker => response({ market: market({ ticker }) }),
        getMarketCandlesticks: async (_seriesTicker, ticker) => response({
            ticker,
            candlesticks: [],
        }),
        getMarketOrderbook: async () => response({
            orderbook_fp: { yes_dollars: [], no_dollars: [] },
        }),
        getMarkets: async () => response({ markets: [market()], cursor: "" }),
        getSeries: async () => response({ series: series() }),
        getSeriesList: async () => response({ series: [series()] }),
        getTrades: async () => response({ trades: [trade()], cursor: "" }),
    },
    ...overrides,
})


const sdk = (apis: KalshiPublicAPIs) =>
    new KalshiPublicSDK({} as never, apis)


describe("KalshiPublicSDK", () => {

    it("turns named market arguments into the generated positional call", async () => {
        const calls: unknown[][] = []
        const apis = publicAPIs({
            markets: {
                ...publicAPIs().markets,
                getMarkets: async (...args: unknown[]) => {
                    calls.push(args)
                    return response({ markets: [market()], cursor: "" })
                },
            } as never,
        })

        const markets = await sdk(apis).markets.list({
            status:       "open",
            eventTicker:  " KXTEST-26 ",
            seriesTicker: " KXTEST ",
            limit:        12,
        })

        assert.equal(markets.length, 1)
        assert.equal(calls.length, 1)
        assert.equal(calls[0][0], 12)
        assert.equal(calls[0][2], "KXTEST-26")
        assert.equal(calls[0][3], "KXTEST")
        assert.equal(calls[0][11], "open")
    })


    it("merges and marks the historical market partition for settled listings", async () => {
        const apis = publicAPIs({
            markets: {
                ...publicAPIs().markets,
                getMarkets: async () => response({
                    markets: [market({ ticker: "LIVE", status: "finalized" })],
                    cursor: "",
                }),
            },
            historical: {
                ...publicAPIs().historical,
                getHistoricalMarkets: async () => response({
                    markets: [
                        market({ ticker: "LIVE", status: "finalized" }),
                        market({ ticker: "ARCHIVED", status: "finalized" }),
                    ],
                    cursor: "",
                }),
            },
        })

        const markets = await sdk(apis).markets.list({
            status: "settled",
            limit: 10,
        })

        assert.deepEqual(markets.map(value => value.ticker), ["LIVE", "ARCHIVED"])
        assert.equal(markets[0].archived, false)
        assert.equal(markets[1].archived, true)
    })


    it("falls back to the historical collection only for a live 404", async () => {
        const apis = publicAPIs({
            markets: {
                ...publicAPIs().markets,
                getMarket: async () => {
                    throw { response: { status: 404 } }
                },
            },
        })

        const found = await sdk(apis).markets.get("ARCHIVED")

        assert.equal(found.ticker, "ARCHIVED")
        assert.equal(found.archived, true)
    })


    it("merges recent and historical trades without duplicate ids", async () => {
        const apis = publicAPIs({
            markets: {
                ...publicAPIs().markets,
                getTrades: async () => response({
                    trades: [trade({ trade_id: "same" })],
                    cursor: "",
                }),
            },
            historical: {
                ...publicAPIs().historical,
                getTradesHistorical: async () => response({
                    trades: [
                        trade({ trade_id: "same" }),
                        trade({ trade_id: "old", created_time: "2025-01-01T00:00:00Z" }),
                    ],
                    cursor: "",
                }),
            },
        })

        const trades = await sdk(apis).trades.list({
            includeHistorical: true,
            limit: 10,
        })

        assert.deepEqual(trades.map(value => value.id), ["same", "old"])
        assert.equal(trades[0].archived, false)
        assert.equal(trades[1].archived, true)
    })
})
