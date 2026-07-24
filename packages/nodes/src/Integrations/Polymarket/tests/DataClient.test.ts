import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
    POLYMARKET_DATA_BASE_URL,
    PolymarketDataClient,
} from "../client/Data"
import { HTTPMock } from "./HTTPMock"

const USER       = "0x56687bf447db6ffa42ffe2204a05edaa20f55839"
const CONDITION  = `0x${"1".repeat(64)}`
const CONDITION_2 = `0x${"2".repeat(64)}`

const responses = {
    "/":                        { data: "OK" },
    "/positions":               [{}],
    "/closed-positions":        [{}],
    "/v1/market-positions":     [{}],
    "/v1/positions/combos":     { combos: [], pagination: {} },
    "/trades":                  [{}],
    "/activity":                [{}],
    "/v1/activity/combos":      { activity: [], pagination: {} },
    "/value":                   [{}],
    "/traded":                  {},
    "/holders":                 [{}],
    "/oi":                      [{ market: "GLOBAL", value: 1 }],
    "/live-volume":             [{}],
    "/v1/leaderboard":          [{}],
    "/v1/builders/leaderboard": [{}],
    "/v1/builders/volume":      [{}],
    "/v1/accounting/snapshot":  new Uint8Array([1, 2, 3]),
}

describe("PolymarketDataClient", () => {
    it("configures the public Data API transport", () => {
        const http = new HTTPMock(responses)

        new PolymarketDataClient(http.api)

        assert.equal(http.config?.vendor, "Polymarket")
        assert.equal(http.config?.baseURL, POLYMARKET_DATA_BASE_URL)
        assert.deepEqual(
            http.config?.headers,
            { "User-Agent": "PretzelGraph/1.0" },
        )
    })

    it("serializes array parameters as comma-separated values", () => {
        const http = new HTTPMock(responses)

        new PolymarketDataClient(http.api)

        const paramsSerializer = http.config?.paramsSerializer

        assert.equal(
            typeof paramsSerializer === "object" &&
            typeof paramsSerializer.serialize === "function",
            true,
        )

        if (
            typeof paramsSerializer !== "object" ||
            typeof paramsSerializer.serialize !== "function"
        )
            assert.fail("Expected an object params serializer")

        const serialized = paramsSerializer.serialize({
            market: [CONDITION, CONDITION_2],
            eventId: [1, 2],
            active:  false,
        })
        const query = new URLSearchParams(serialized)

        assert.equal(
            query.get("market"),
            `${CONDITION},${CONDITION_2}`,
        )
        assert.equal(query.get("eventId"), "1,2")
        assert.equal(query.get("active"), "false")
    })

    it("routes every public Data method to its documented endpoint", async () => {
        const http   = new HTTPMock(responses)
        const client = new PolymarketDataClient(http.api)

        await client.status.get()
        await client.positions.listCurrent({ user: USER })
        await client.positions.listClosed({ user: USER })
        await client.positions.listForMarket({ market: CONDITION })
        await client.positions.listCombos({ user: USER })
        await client.trades.list()
        await client.activity.list({ user: USER })
        await client.activity.listCombos({ user: USER })
        await client.users.getValue({ user: USER })
        await client.users.getTradedMarketCount({ user: USER })
        await client.markets.listHolders({ market: [CONDITION] })
        await client.markets.getOpenInterest()
        await client.markets.getLiveVolume({ id: 1 })
        await client.leaderboard.list()
        await client.builders.listLeaderboard()
        await client.builders.listVolume()
        await client.accounting.downloadSnapshot({ user: USER })

        assert.deepEqual(
            http.calls.map(({ method, path }) => `${method} ${path}`),
            Object.keys(responses).map((path) => `GET ${path}`),
        )
    })

    it("sends parsed defaults and requests binary accounting data", async () => {
        const http   = new HTTPMock(responses)
        const client = new PolymarketDataClient(http.api)

        await client.positions.listCurrent({ user: USER })
        await client.accounting.downloadSnapshot({ user: USER })

        const positionConfig = http.calls[0].config as {
            params?: Record<string, unknown>
        }
        const accountingConfig = http.calls[1].config as {
            responseType?: string
        }

        assert.deepEqual(positionConfig.params, {
            user:          USER,
            sizeThreshold: 1,
            redeemable:    false,
            mergeable:     false,
            limit:         100,
            offset:        0,
            sortBy:        "TOKENS",
            sortDirection: "DESC",
        })
        assert.equal(accountingConfig.responseType, "arraybuffer")
    })
})
