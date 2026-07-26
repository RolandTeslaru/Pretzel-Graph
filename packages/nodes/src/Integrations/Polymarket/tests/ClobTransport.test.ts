import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { ClobClient, Chain } from "@polymarket/clob-client-v2"

import { assertPatched, createUnauthenticatedClobSDK } from "../client/CLOB/common"

// A stand-in for HTTP.Client.raw — the proxied instance httpClientFactory hands over.
const stubHttp = (raw: unknown) => ({ create: () => ({ raw }) }) as never

describe("Polymarket CLOB transport", () => {

    it("threads the node's axios instance into the SDK", () => {
        const raw = (async () => ({ data: {} })) as never
        const client = createUnauthenticatedClobSDK(stubHttp(raw))

        assert.equal((client as { axiosInstance?: unknown }).axiosInstance, raw)
    })

    // Guards against `npm ci --ignore-scripts`, which skips the postinstall that applies
    // the patch. Unpatched, `axiosInstance` is dropped and every request egresses direct —
    // so simulate that by handing assertPatched a client that never stored it.
    it("refuses a client that dropped the transport", () => {
        const raw = (async () => ({ data: {} })) as never
        const dropped = new ClobClient({ host: "https://clob.polymarket.com", chain: Chain.POLYGON })

        assert.throws(() => assertPatched(dropped, raw), /patch is not applied/)
    })

    it("routes a real SDK call through the injected instance", async () => {
        const seen: string[] = []
        const raw = (async (config: { url: string }) => {
            seen.push(config.url)
            return { data: { mid: "0.42" }, status: 200 }
        }) as never

        const client = createUnauthenticatedClobSDK(stubHttp(raw))
        const result = await (client as unknown as ClobClient).getMidpoint("token-123")

        assert.deepEqual(seen, ["https://clob.polymarket.com/midpoint"])
        assert.deepEqual(result, { mid: "0.42" })
    })
})
