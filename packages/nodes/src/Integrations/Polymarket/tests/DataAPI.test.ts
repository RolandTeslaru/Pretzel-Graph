import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { Polymarket } from "../domain"

const USER      = "0x56687bf447db6ffa42ffe2204a05edaa20f55839"
const CONDITION = `0x${"1".repeat(64)}`

type CurrentPositionsRequest =
    Polymarket.Data.API.Positions.ListCurrent.Request

const validMarketRequest: CurrentPositionsRequest = {
    user:   USER,
    market: [CONDITION],
}
const validEventRequest: CurrentPositionsRequest = {
    user:    USER,
    eventId: [1],
}
const validUnfilteredRequest: CurrentPositionsRequest = { user: USER }

// Compile-time assertion: the inferred request type must reject both filters.
// @ts-expect-error market and eventId are mutually exclusive.
const invalidCombinedRequest: CurrentPositionsRequest = {
    user:    USER,
    market:  [CONDITION],
    eventId: [1],
}

void validMarketRequest
void validEventRequest
void validUnfilteredRequest
void invalidCombinedRequest

describe("Polymarket Data API requests", () => {
    it("coerces numeric ids so callers pass raw field values", () => {
        // Node fields and tool arguments are both strings; Number() ignores surrounding
        // whitespace, so coercing here removes the per-caller parse-and-check.
        assert.deepEqual(
            Polymarket.Data.API.Markets.GetLiveVolume.Request.parse({ id: " 42 " }),
            { id: 42 },
        )

        for (const id of ["abc", "0", ""])
            assert.throws(() => Polymarket.Data.API.Markets.GetLiveVolume.Request.parse({ id }))
    })

    const filteredRequests = [
        {
            name:   "current positions",
            schema: Polymarket.Data.API.Positions.ListCurrent.Request,
            base:   { user: USER },
        },
        {
            name:   "closed positions",
            schema: Polymarket.Data.API.Positions.ListClosed.Request,
            base:   { user: USER },
        },
        {
            name:   "trades",
            schema: Polymarket.Data.API.Trades.List.Request,
            base:   {},
        },
        {
            name:   "activity",
            schema: Polymarket.Data.API.Activity.List.Request,
            base:   { user: USER },
        },
    ] as const

    for (const { name, schema, base } of filteredRequests) {
        it(`${name} accepts market, event, or neither`, () => {
            assert.equal(
                schema.safeParse({
                    ...base,
                    market: [CONDITION],
                }).success,
                true,
            )
            assert.equal(
                schema.safeParse({
                    ...base,
                    eventId: [1],
                }).success,
                true,
            )
            assert.equal(schema.safeParse(base).success, true)
        })

        it(`${name} rejects market and event together`, () => {
            assert.equal(
                schema.safeParse({
                    ...base,
                    market:  [CONDITION],
                    eventId: [1],
                }).success,
                false,
            )
        })
    }

    it("applies documented position defaults", () => {
        const request =
            Polymarket.Data.API.Positions.ListCurrent.Request.parse({
                user: USER,
            })

        assert.deepEqual(request, {
            user:          USER,
            sizeThreshold: 1,
            redeemable:    false,
            mergeable:     false,
            limit:         100,
            offset:        0,
            sortBy:        "TOKENS",
            sortDirection: "DESC",
        })
    })

    it("requires trade amount and type filters together", () => {
        const Request = Polymarket.Data.API.Trades.List.Request

        assert.equal(
            Request.safeParse({ filterType: "CASH" }).success,
            false,
        )
        assert.equal(
            Request.safeParse({ filterAmount: 100 }).success,
            false,
        )
        assert.equal(
            Request.safeParse({
                filterType:   "CASH",
                filterAmount: 100,
            }).success,
            true,
        )
    })

    it("validates addresses and condition identifiers", () => {
        const Request =
            Polymarket.Data.API.Positions.ListForMarket.Request

        assert.equal(
            Request.safeParse({
                market: "not-a-condition",
            }).success,
            false,
        )
        assert.equal(
            Polymarket.Data.API.Users.GetValue.Request.safeParse({
                user: "not-a-wallet",
            }).success,
            false,
        )
    })
})

describe("Polymarket Data API responses", () => {
    it("accepts documented aggregate identifiers and empty lifecycle fields", () => {
        assert.equal(
            Polymarket.Data.API.Markets.GetOpenInterest.Response.safeParse([
                { market: "GLOBAL", value: 100 },
            ]).success,
            true,
        )
        assert.equal(
            Polymarket.Data.API.Markets.GetLiveVolume.Response.safeParse([
                {
                    total: 100,
                    markets: [
                        { market: "", value: 10 },
                        { market: CONDITION, value: 90 },
                    ],
                },
            ]).success,
            true,
        )
        assert.equal(
            Polymarket.Data.API.Activity.List.Response.safeParse([
                {
                    conditionId: "",
                    type:        "REWARD",
                    side:        "",
                },
            ]).success,
            true,
        )
    })

    it("preserves unknown fields on evolving entities", () => {
        const [position] =
            Polymarket.Data.API.Positions.ListCurrent.Response.parse([
                {
                    proxyWallet: USER,
                    futureField: "preserved",
                },
            ])

        assert.equal(position.futureField, "preserved")
    })

    it("validates accounting snapshots as binary data", () => {
        const Response =
            Polymarket.Data.API.Accounting.DownloadSnapshot.Response

        assert.equal(
            Response.safeParse(new Uint8Array([1, 2, 3])).success,
            true,
        )
        assert.equal(Response.safeParse("not-binary").success, false)
    })
})
