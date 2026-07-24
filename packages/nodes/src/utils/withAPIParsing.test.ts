import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { z } from "zod"

import { withAPIParsing } from "./withAPIParsing"

describe("withAPIParsing", () => {
    it("parses defaults before invoking the handler", async () => {
        const Request = z
            .object({
                limit: z.number().int().default(25),
            })
            .prefault({})
        const Response = z.object({
            count: z.number().int(),
        })

        let received: z.output<typeof Request> | undefined

        const method = withAPIParsing(
            Request,
            Response,
            (request) => {
                received = request
                return { count: request.limit }
            },
        )

        assert.deepEqual(await method(), { count: 25 })
        assert.deepEqual(received, { limit: 25 })
    })

    it("does not invoke the handler when the request is invalid", async () => {
        let invoked = false

        const method = withAPIParsing(
            z.object({ value: z.number().positive() }),
            z.number(),
            () => {
                invoked = true
                return 1
            },
        )

        await assert.rejects(
            method({ value: -1 }),
            z.ZodError,
        )
        assert.equal(invoked, false)
    })

    it("rejects an invalid handler response", async () => {
        const method = withAPIParsing(
            z.object({}).prefault({}),
            z.object({ ok: z.boolean() }),
            () => ({ ok: "yes" }),
        )

        await assert.rejects(
            method(),
            z.ZodError,
        )
    })

    it("preserves asynchronous handlers", async () => {
        const method = withAPIParsing(
            z.object({ value: z.coerce.number() }),
            z.number(),
            async ({ value }) => value * 2,
        )

        assert.equal(await method({ value: "4" }), 8)
    })
})
