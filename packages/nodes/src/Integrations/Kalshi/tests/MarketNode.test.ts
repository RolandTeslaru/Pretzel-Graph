import "reflect-metadata"

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

import {
    CatalogueService,
    FieldBuilder,
} from "@pretzel-graph/node-sdk"
import { Foundations } from "@pretzel-graph/shared/domain"

import { Blueprint } from "../Market/blueprint"
import { buildTools } from "../Market/tools"


const routes = [
    { operation: "listMarkets",       values: { action: "list", listResource: "markets" },       output: "markets"   },
    { operation: "listEvents",        values: { action: "list", listResource: "events" },        output: "events"    },
    { operation: "listSeries",        values: { action: "list", listResource: "series" },        output: "series"    },
    { operation: "listTrades",        values: { action: "list", listResource: "trades" },        output: "trades"    },
    { operation: "getMarket",         values: { action: "get",  getResource: "market" },         output: "market"    },
    { operation: "getEvent",          values: { action: "get",  getResource: "event" },          output: "event"     },
    { operation: "getSeries",         values: { action: "get",  getResource: "series" },         output: "series"    },
    { operation: "getOrderBook",      values: { action: "get",  getResource: "orderBook" },      output: "orderBook" },
    { operation: "getPriceHistory",   values: { action: "get",  getResource: "priceHistory" },   output: "history"   },
    { operation: "getExchangeStatus", values: { action: "get",  getResource: "exchangeStatus" }, output: "status"    },
] as const

type Route = typeof routes[number]

const nodesRoot = fileURLToPath(new URL("../../..", import.meta.url))

const deriveFor = (route: Route) =>
    Foundations.Blueprint.derive(
        Blueprint,
        { ...route.values, isConvertedToTool: false } as never,
    ).blueprint


describe("Kalshi Market derivatives", () => {

    it("derives one focused valid blueprint for every operation", () => {
        assert.equal(new Set(routes.map(route => route.operation)).size, routes.length)

        for (const route of routes) {
            const derived = deriveFor(route)

            assert.deepEqual(derived.inputs.map(input => input.id), [], route.operation)
            assert.deepEqual(derived.outputs.map(output => output.id), [route.output], route.operation)
            assert.equal(Foundations.Blueprint.Schema.safeParse(derived).success, true, route.operation)

            const fieldIds = derived.fields.map(field => String(field.id))
            assert.equal(new Set(fieldIds).size, fieldIds.length, route.operation)
            assert.equal(fieldIds.includes("action"), true, route.operation)
            assert.equal(fieldIds.includes("isConvertedToTool"), true, route.operation)
            assert.equal("_derivatives" in derived, false, route.operation)
        }
    })


    it("defaults to browsing open markets", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, {})

        assert.equal(derivativeId, "action==list/listResource==markets")
        assert.deepEqual(
            blueprint.fields
                .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            [
                "action",
                "listResource",
                "listMarketsStatus",
                "listMarketsEventTicker",
                "listMarketsSeriesTicker",
                "listMarketsMaxResults",
            ],
        )
        assert.deepEqual(blueprint.outputs.map(output => output.id), ["markets"])
    })


    it("keeps tool mode terminal and free of editor configuration", () => {
        const { blueprint } = Foundations.Blueprint.derive(
            Blueprint,
            { isConvertedToTool: true } as never,
        )

        assert.deepEqual(blueprint.outputs.map(output => output.id), ["tools"])
        assert.deepEqual(
            blueprint.fields
                .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            [],
        )
    })


    it("exposes every operation as a uniquely named tool", () => {
        const tools = buildTools({} as never)
        const names = tools.map(built => built.name)

        assert.equal(tools.length, routes.length)
        assert.equal(new Set(names).size, names.length)

        for (const name of names)
            assert.match(name, /^kalshi_/)
    })


    it("resolves its inline derivative through the catalogue", async () => {
        CatalogueService.setNodesRoot(nodesRoot)

        const result = await CatalogueService.resolveBlueprint(
            Blueprint.id,
            { action: "get", getResource: "orderBook" } as never,
        )

        assert.deepEqual(result?.outputs.map(output => output.id), ["orderBook"])
        assert.equal(
            result?.fields.some(field => String(field.id) === "getOrderBookTicker"),
            true,
        )
    })
})
