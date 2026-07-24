import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { Polymarket } from "../domain"

const USER = "0x56687bf447db6ffa42ffe2204a05edaa20f55839"

describe("Polymarket Gamma API requests", () => {
    it("applies list and keyset defaults", () => {
        assert.deepEqual(
            Polymarket.Gamma.API.Events.List.Request.parse(undefined),
            {},
        )
        assert.deepEqual(
            Polymarket.Gamma.API.Events.ListKeyset.Request.parse(undefined),
            {
                limit:     20,
                ascending: true,
            },
        )
        assert.deepEqual(
            Polymarket.Gamma.API.Markets.List.Request.parse(undefined),
            {
                closed: false,
            },
        )
        assert.deepEqual(
            Polymarket.Gamma.API.Markets.ListKeyset.Request.parse(undefined),
            {
                limit:     20,
                ascending: true,
                closed:    false,
            },
        )
    })

    it("requires both comment parent fields", () => {
        const Request = Polymarket.Gamma.API.Comments.List.Request

        assert.equal(Request.safeParse({}).success, false)
        assert.equal(
            Request.safeParse({
                parent_entity_type: "Event",
                parent_entity_id:   1,
            }).success,
            true,
        )
    })

    it("validates search queries and wallet addresses", () => {
        assert.equal(
            Polymarket.Gamma.API.Search.Public.Request.safeParse({
                q: "",
            }).success,
            false,
        )
        assert.equal(
            Polymarket.Gamma.API.Profiles.GetPublic.Request.safeParse({
                address: "not-a-wallet",
            }).success,
            false,
        )
        assert.equal(
            Polymarket.Gamma.API.Profiles.GetPublic.Request.safeParse({
                address: USER,
            }).success,
            true,
        )
    })

    it("enforces documented keyset limits", () => {
        assert.equal(
            Polymarket.Gamma.API.Events.ListKeyset.Request.safeParse({
                limit: 501,
            }).success,
            false,
        )
        assert.equal(
            Polymarket.Gamma.API.Markets.ListKeyset.Request.safeParse({
                limit: 101,
            }).success,
            false,
        )
    })
})

describe("Polymarket Gamma API responses", () => {
    it("coerces numeric entity IDs to branded strings", () => {
        const [event] =
            Polymarket.Gamma.API.Events.List.Response.parse([
                { id: 42 },
            ])
        const [market] =
            Polymarket.Gamma.API.Markets.List.Response.parse([
                { id: 7 },
            ])

        assert.equal(event.id, "42")
        assert.equal(market.id, "7")
    })

    it("preserves unknown fields on evolving entities", () => {
        const event =
            Polymarket.Gamma.API.Events.GetById.Response.parse({
                id:          "1",
                futureField: "preserved",
            })

        assert.equal(event.futureField, "preserved")
    })

    it("models the singular comment route's array response", () => {
        assert.equal(
            Polymarket.Gamma.API.Comments.GetById.Response.safeParse([
                { id: "1" },
            ]).success,
            true,
        )
        assert.equal(
            Polymarket.Gamma.API.Comments.GetById.Response.safeParse({
                id: "1",
            }).success,
            false,
        )
    })

    it("requires search pagination metadata", () => {
        const Response = Polymarket.Gamma.API.Search.Public.Response

        assert.equal(
            Response.safeParse({
                events:     [],
                tags:       [],
                profiles:   [],
                pagination: {
                    hasMore:      false,
                    totalResults: 0,
                },
            }).success,
            true,
        )
        assert.equal(Response.safeParse({ events: [] }).success, false)
    })
})
