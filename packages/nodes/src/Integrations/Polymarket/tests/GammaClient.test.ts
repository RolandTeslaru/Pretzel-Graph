import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
    POLYMARKET_GAMMA_BASE_URL,
    PolymarketGammaClient,
} from "../client/Gamma"
import { HTTPMock } from "./HTTPMock"

const USER = "0x56687bf447db6ffa42ffe2204a05edaa20f55839"

const responses = {
    "/status":                                      "OK",
    "/events":                                      [{ id: "1" }],
    "/events/keyset":                               { events: [] },
    "/events/event%2Fid":                           { id: "1" },
    "/events/slug/event%2Fslug":                    { id: "1" },
    "/events/1/tags":                               [{ id: "1" }],
    "/markets":                                     [{ id: "1" }],
    "/markets/keyset":                              { markets: [] },
    "/markets/market%2Fid":                         { id: "1" },
    "/markets/slug/market%2Fslug":                  { id: "1" },
    "/markets/1/tags":                              [{ id: "1" }],
    "/tags":                                        [{ id: "1" }],
    "/tags/1":                                      { id: "1" },
    "/tags/slug/tag%2Fslug":                        { id: "1" },
    "/tags/1/related-tags":                         [],
    "/tags/slug/tag%2Fslug/related-tags":           [],
    "/tags/1/related-tags/tags":                    [],
    "/tags/slug/tag%2Fslug/related-tags/tags":      [],
    "/series":                                      [{ id: "1" }],
    "/series/1":                                    { id: "1" },
    "/comments":                                    [{ id: "1" }],
    "/comments/comment%2Fid":                       [{ id: "1" }],
    [`/comments/user_address/${USER}`]:             [{ id: "1" }],
    "/public-profile":                              {},
    "/public-search":                               {
        events:     [],
        tags:       [],
        profiles:   [],
        pagination: {
            hasMore:      false,
            totalResults: 0,
        },
    },
    "/sports":                                      [{ sport: "soccer" }],
    "/sports/market-types":                         { marketTypes: [] },
    "/teams":                                       [{ id: 1 }],
}

describe("PolymarketGammaClient", () => {
    it("configures Gamma's repeated-key array serializer", () => {
        const http = new HTTPMock(responses)

        new PolymarketGammaClient(http.api)

        assert.equal(http.config?.vendor, "Polymarket")
        assert.equal(http.config?.baseURL, POLYMARKET_GAMMA_BASE_URL)
        assert.deepEqual(
            http.config?.paramsSerializer,
            { indexes: null },
        )
    })

    it("routes the complete Gamma surface", async () => {
        const http   = new HTTPMock(responses)
        const client = new PolymarketGammaClient(http.api)

        await client.status.get()
        await client.events.list()
        await client.events.listKeyset()
        await client.events.getById({ id: "event/id" })
        await client.events.getBySlug({ slug: "event/slug" })
        await client.events.getTags({ id: "1" })
        await client.markets.list()
        await client.markets.listKeyset()
        await client.markets.getById({ id: "market/id" })
        await client.markets.getBySlug({ slug: "market/slug" })
        await client.markets.getTags({ id: "1" })
        await client.tags.list()
        await client.tags.getById({ id: "1" })
        await client.tags.getBySlug({ slug: "tag/slug" })
        await client.tags.getRelationshipsById({ id: "1" })
        await client.tags.getRelationshipsBySlug({ slug: "tag/slug" })
        await client.tags.getRelatedById({ id: "1" })
        await client.tags.getRelatedBySlug({ slug: "tag/slug" })
        await client.series.list()
        await client.series.getById({ id: "1" })
        await client.comments.list({
            parent_entity_type: "Event",
            parent_entity_id:   1,
        })
        await client.comments.getById({ id: "comment/id" })
        await client.comments.getByUserAddress({
            user_address: USER,
        })
        await client.profiles.getPublic({ address: USER })
        await client.search.public({ q: "election" })
        await client.sports.list()
        await client.sports.listMarketTypes()
        await client.sports.listTeams()

        assert.deepEqual(
            http.calls.map(({ method, path }) => `${method} ${path}`),
            Object.keys(responses).map((path) => `GET ${path}`),
        )
    })

    it("does not send path parameters as query parameters", async () => {
        const http   = new HTTPMock(responses)
        const client = new PolymarketGammaClient(http.api)

        await client.events.getById({
            id:           "event/id",
            include_chat: true,
        })

        const config = http.calls[0].config as {
            params?: Record<string, unknown>
        }

        assert.deepEqual(config.params, {
            include_chat: true,
        })
    })
})
