import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type { HTTP } from "@pretzel-graph/node-sdk"

import {
    createAlpacaFetch,
    parseAlpacaCredentials,
} from "../client"


describe("Alpaca client boundary", () => {

    it("defaults legacy credentials to paper and trims secrets", () => {
        assert.deepEqual(
            parseAlpacaCredentials({
                apiKeyId:  " key ",
                apiSecret: " secret ",
            }),
            {
                keyId:       "key",
                secret:      "secret",
                environment: "paper",
            },
        )

        assert.equal(
            parseAlpacaCredentials({
                apiKeyId:   "key",
                apiSecret:  "secret",
                environment: "live",
            }).environment,
            "live",
        )
    })


    it("adapts fetch to one retry-free Pretzel HTTP client", async () => {
        let factoryConfig: HTTP.Client.Config | undefined
        let requestConfig: Record<string, unknown> | undefined

        const http: HTTP.ClientAPI = {
            create: config => {
                factoryConfig = config

                return {
                    raw: {
                        request: async (value: Record<string, unknown>) => {
                            requestConfig = value
                            return {
                                data:       new TextEncoder().encode('{"ok":true}').buffer,
                                status:     200,
                                statusText: "OK",
                                headers:    { "content-type": "application/json" },
                            }
                        },
                    },
                } as never
            },
        }

        const signal = new AbortController().signal
        const fetch  = createAlpacaFetch(http)
        const result = await fetch("https://data.alpaca.markets/v2/test", {
            method:  "POST",
            headers: { "x-test": "yes" },
            body:    '{"request":true}',
            signal,
            redirect: "error",
        })

        assert.equal(factoryConfig?.vendor, "Alpaca")
        assert.equal(factoryConfig?.retries, 0)
        assert.equal(requestConfig?.signal, signal)
        assert.equal(requestConfig?.maxRedirects, 0)
        assert.deepEqual(await result.json(), { ok: true })
    })
})
