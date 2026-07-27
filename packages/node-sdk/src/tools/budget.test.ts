import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ToolBudget } from "./budget"


const bytes = (json: string) => Buffer.byteLength(json, "utf8")

const items = (count: number, size = 100) =>
    Array.from({ length: count }, (_, index) => ({
        id:      index,
        padding: "x".repeat(size),
    }))


describe("ToolBudget.list", () => {
    it("passes a small result through untouched", () => {
        const parsed = JSON.parse(ToolBudget.list("markets", items(3)))

        assert.equal(parsed.count, 3)
        assert.equal(parsed.markets.length, 3)
        assert.equal("_truncated" in parsed, false)
    })

    it("keeps the largest prefix that fits, and says so", () => {
        const maxBytes = 2_000
        const json     = ToolBudget.list("markets", items(500), { maxBytes })
        const parsed   = JSON.parse(json)

        assert.ok(bytes(json) <= maxBytes)
        assert.ok(parsed.markets.length > 0, "should keep what it can rather than emptying the list")
        assert.equal(parsed._truncated.of, 500)
        assert.equal(parsed.count, parsed.markets.length)
    })

    it("reports the count actually present, not the count requested", () => {
        // A model that misses _truncated must still not be told it received 500 items.
        const parsed = JSON.parse(ToolBudget.list("markets", items(500), { maxBytes: 2_000 }))

        assert.equal(parsed.count, parsed.markets.length)
        assert.ok(parsed.count < 500)
    })

    it("surfaces the caller's hint on the truncation note", () => {
        const parsed = JSON.parse(
            ToolBudget.list("markets", items(500), { maxBytes: 2_000, hint: "Lower the limit." }),
        )

        assert.equal(parsed._truncated.hint, "Lower the limit.")
    })

    it("empties the list rather than overflowing when one item is already too big", () => {
        const json = ToolBudget.list("markets", items(3, 50_000), { maxBytes: 1_000 })

        assert.ok(bytes(json) <= 1_000)
        assert.equal(JSON.parse(json).count, 0)
    })
})


describe("ToolBudget.value", () => {
    it("passes a small object through untouched", () => {
        const json = ToolBudget.value({ price: "0.5", side: "BUY" })

        assert.deepEqual(JSON.parse(json), { price: "0.5", side: "BUY" })
    })

    it("trims every array member of a record together", () => {
        const maxBytes = 3_000
        const json     = ToolBudget.value(
            {
                events:     items(300),
                profiles:   items(300),
                pagination: { hasMore: true, totalResults: 300 },
            },
            { maxBytes },
        )
        const parsed = JSON.parse(json)

        assert.ok(bytes(json) <= maxBytes)
        assert.equal(parsed._truncated.events.of, 300)
        assert.equal(parsed._truncated.profiles.of, 300)
        assert.deepEqual(parsed.pagination, { hasMore: true, totalResults: 300 })
    })

    it("treats a bare array as a list", () => {
        const parsed = JSON.parse(ToolBudget.value(items(500), { maxBytes: 2_000 }))

        assert.equal(parsed._truncated.of, 500)
        assert.equal(parsed.count, parsed.items.length)
    })

    it("withholds an object it cannot shorten, and names the largest fields", () => {
        const json = ToolBudget.value(
            {
                description: "x".repeat(80_000),
                slug:        "short",
            },
            { maxBytes: 1_000, hint: "Ask for one market." },
        )
        const parsed = JSON.parse(json)

        assert.ok(bytes(json) <= 1_000)
        assert.equal(parsed._withheld.limit, 1_000)
        assert.ok(parsed._withheld.bytes > 80_000)
        assert.equal(parsed._withheld.hint, "Ask for one market.")
        assert.equal(Object.keys(parsed._withheld.largestFields)[0], "description")
    })

    it("withholds when emptying the arrays still is not enough", () => {
        const parsed = JSON.parse(
            ToolBudget.value(
                {
                    blob:   "x".repeat(80_000),
                    events: items(10),
                },
                { maxBytes: 1_000 },
            ),
        )

        assert.ok(parsed._withheld)
    })

    it("serializes undefined as null rather than returning the empty string", () => {
        // JSON.stringify(undefined) is undefined, which would reach the model as an empty tool
        // result and read as a successful call with no data.
        assert.equal(ToolBudget.value(undefined), "null")
    })
})
