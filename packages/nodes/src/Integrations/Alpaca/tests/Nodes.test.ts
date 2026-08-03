import "reflect-metadata"

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

import {
    CatalogueService,
    FieldBuilder,
} from "@pretzel-graph/node-sdk"
import { Foundations } from "@pretzel-graph/shared/domain"

import { Blueprint as AccountBlueprint } from "../Account/blueprint"
import { buildTools as buildAccountTools } from "../Account/tools"
import { Blueprint as MarketBlueprint } from "../Market/blueprint"
import { buildTools as buildMarketTools } from "../Market/tools"
import { Blueprint as TradingBlueprint } from "../Trading/blueprint"
import { buildTools as buildTradingTools } from "../Trading/tools"


const nodesRoot = fileURLToPath(new URL("../../..", import.meta.url))

const customFields = (blueprint: Foundations.Blueprint) =>
    blueprint.fields
        .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
        .map(field => String(field.id))

const credentialIds = (blueprint: Foundations.Blueprint) =>
    blueprint.credentials?.map(value => String(value.id)) ?? []


describe("Alpaca Market derivatives", () => {
    const routes = [
        { name: "listAssets",    values: { resource: "assets", assetsAction: "list" },                  output: "assets"   },
        { name: "getAsset",      values: { resource: "assets", assetsAction: "get" },                   output: "asset"    },
        { name: "clock",         values: { resource: "clock" },                                         output: "clock"    },
        { name: "calendar",      values: { resource: "calendar" },                                      output: "calendar" },
        { name: "bars",          values: { resource: "bars" },                                          output: "bars"     },
        { name: "trades",        values: { resource: "trades" },                                        output: "trades"   },
        { name: "quotes",        values: { resource: "quotes" },                                        output: "quotes"   },
        { name: "snapshot",      values: { resource: "snapshot" },                                      output: "snapshot" },
        { name: "news",          values: { resource: "news" },                                          output: "news"     },
        { name: "contracts",     values: { resource: "options", optionsAction: "listContracts" },      output: "contracts" },
        { name: "contract",      values: { resource: "options", optionsAction: "getContract" },        output: "contract" },
        { name: "chain",         values: { resource: "options", optionsAction: "chain" },              output: "chain"    },
        { name: "mostActive",    values: { resource: "screener", screenerView: "mostActive" },         output: "active"   },
        { name: "movers",        values: { resource: "screener", screenerView: "movers" },             output: "movers"   },
    ] as const

    it("derives every regular operation to one valid output", () => {
        for (const route of routes) {
            const { blueprint } = Foundations.Blueprint.derive(MarketBlueprint, route.values as never)

            assert.equal(Foundations.Blueprint.Schema.safeParse(blueprint).success, true, route.name)
            assert.deepEqual(blueprint.outputs.map(output => output.id), [route.output], route.name)
            assert.equal(new Set(customFields(blueprint)).size, customFields(blueprint).length, route.name)
        }
    })

    it("keeps tool mode terminal, credentialed and complete", () => {
        const { blueprint } = Foundations.Blueprint.derive(
            MarketBlueprint,
            { isConvertedToTool: true } as never,
        )

        assert.deepEqual(customFields(blueprint), [])
        assert.deepEqual(blueprint.outputs.map(output => output.id), ["tools"])
        assert.ok(credentialIds(blueprint).includes("alpacaApi"))

        const names = buildMarketTools({} as never).map(value => value.name)
        assert.equal(names.length, routes.length)
        assert.equal(new Set(names).size, names.length)
        assert.ok(names.every(name => name.startsWith("alpaca_market_")))
    })
})


describe("Alpaca Account derivatives", () => {
    const routes = [
        { name: "summary",       values: { resource: "summary" },                                        output: "account"       },
        { name: "configuration", values: { resource: "configuration" },                                  output: "configuration" },
        { name: "positions",     values: { resource: "positions", positionsAction: "list" },            output: "positions"     },
        { name: "position",      values: { resource: "positions", positionsAction: "get" },             output: "position"      },
        { name: "orders",        values: { resource: "orders", ordersAction: "list" },                  output: "orders"        },
        { name: "order",         values: { resource: "orders", ordersAction: "get" },                   output: "order"         },
        { name: "activities",    values: { resource: "activities" },                                     output: "activities"    },
        { name: "portfolio",     values: { resource: "portfolio" },                                      output: "portfolio"     },
        { name: "watchlists",    values: { resource: "watchlists", watchlistsAction: "list" },          output: "watchlists"    },
        { name: "watchlist",     values: { resource: "watchlists", watchlistsAction: "get" },           output: "watchlist"     },
    ] as const

    it("derives every account operation and exposes matching tools", () => {
        for (const route of routes) {
            const { blueprint } = Foundations.Blueprint.derive(AccountBlueprint, route.values as never)
            assert.equal(Foundations.Blueprint.Schema.safeParse(blueprint).success, true, route.name)
            assert.deepEqual(blueprint.outputs.map(output => output.id), [route.output], route.name)
        }

        const names = buildAccountTools({} as never).map(value => value.name)
        assert.equal(names.length, routes.length)
        assert.equal(new Set(names).size, names.length)
        assert.ok(names.every(name => name.startsWith("alpaca_account_")))
    })
})


describe("Alpaca Trading derivatives", () => {
    const routes = [
        { name: "market",          values: { action: "submit", orderType: "market" },                              output: "order"  },
        { name: "limit",           values: { action: "submit", orderType: "limit" },                               output: "order"  },
        { name: "stop",            values: { action: "submit", orderType: "stop" },                                output: "order"  },
        { name: "stopLimit",       values: { action: "submit", orderType: "stop_limit" },                          output: "order"  },
        { name: "trailingPrice",   values: { action: "submit", orderType: "trailing_stop", trailingMode: "price" }, output: "order" },
        { name: "trailingPercent", values: { action: "submit", orderType: "trailing_stop", trailingMode: "percent" }, output: "order" },
        { name: "replace",         values: { action: "replace" },                                                  output: "order"  },
        { name: "cancel",          values: { action: "cancel" },                                                   output: "result" },
        { name: "cancelAll",       values: { action: "cancelAll" },                                                output: "result" },
        { name: "closeAllOfOne",   values: { action: "closePosition", closeAmountType: "all" },                   output: "order"  },
        { name: "closeQuantity",   values: { action: "closePosition", closeAmountType: "quantity" },              output: "order"  },
        { name: "closePercent",    values: { action: "closePosition", closeAmountType: "percentage" },            output: "order"  },
        { name: "closeAll",        values: { action: "closeAll" },                                                 output: "result" },
        { name: "exercise",        values: { action: "exerciseOption" },                                           output: "result" },
    ] as const

    it("derives every mutation with an explicit live confirmation field", () => {
        for (const route of routes) {
            const { blueprint } = Foundations.Blueprint.derive(TradingBlueprint, route.values as never)

            assert.equal(Foundations.Blueprint.Schema.safeParse(blueprint).success, true, route.name)
            assert.deepEqual(blueprint.outputs.map(output => output.id), [route.output], route.name)
            assert.ok(
                customFields(blueprint).some(id => id.endsWith("ConfirmLive")),
                route.name,
            )
        }
    })

    it("exposes one bounded tool per mutation family", () => {
        const names = buildTradingTools({} as never).map(value => value.name)

        assert.equal(names.length, 7)
        assert.equal(new Set(names).size, names.length)
        assert.ok(names.every(name => name.startsWith("alpaca_trading_")))
    })

    it("resolves new namespace derivatives through the catalogue", async () => {
        CatalogueService.setNodesRoot(nodesRoot)

        const account = await CatalogueService.resolveBlueprint(
            AccountBlueprint.id,
            { resource: "positions", positionsAction: "get" } as never,
        )
        const trading = await CatalogueService.resolveBlueprint(
            TradingBlueprint.id,
            { action: "cancel" } as never,
        )

        assert.deepEqual(account?.outputs.map(output => output.id), ["position"])
        assert.deepEqual(trading?.outputs.map(output => output.id), ["result"])
    })
})
