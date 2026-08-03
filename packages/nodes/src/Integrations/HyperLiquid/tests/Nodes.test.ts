import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
    CatalogueService,
    FieldBuilder,
} from "@pretzel-graph/node-sdk";
import { Foundations } from "@pretzel-graph/shared/domain";

import { Blueprint as AccountBlueprint } from "../Account/blueprint";
import { buildTools as buildAccountTools } from "../Account/tools";
import { Blueprint as MarketBlueprint } from "../Market/blueprint";
import { buildTools as buildMarketTools } from "../Market/tools";


const nodesRoot = fileURLToPath(new URL("../../..", import.meta.url));

const marketRoutes = [
    { resource: "markets",   output: "markets"   },
    { resource: "mids",      output: "mids"      },
    { resource: "candles",   output: "candles"   },
    { resource: "orderBook", output: "orderBook" },
] as const;

const accountRoutes = [
    { resource: "state",        output: "state"        },
    { resource: "positions",    output: "positions"    },
    { resource: "spotBalances", output: "spotBalances" },
    { resource: "openOrders",   output: "openOrders"   },
    { resource: "fills",        output: "fills"        },
    { resource: "funding",      output: "funding"      },
] as const;


describe("Hyperliquid node blueprints", () => {

    it("does not expose the optional network proxy credential", () => {
        for (const blueprint of [MarketBlueprint, AccountBlueprint]) {
            assert.equal(blueprint.proxyCompatible, undefined);
            assert.deepEqual(blueprint.credentials, []);
        }
    });

    it("derives one focused output for every Market resource", () => {
        for (const route of marketRoutes) {
            const { blueprint, derivativeId } = Foundations.Blueprint.derive(
                MarketBlueprint,
                { resource: route.resource } as never,
            );

            assert.equal(derivativeId, `resource==${route.resource}`);
            assert.deepEqual(blueprint.outputs.map(output => output.id), [route.output]);
            assert.equal(Foundations.Blueprint.Schema.safeParse(blueprint).success, true);
        }
    });


    it("derives one focused output for every Account resource", () => {
        for (const route of accountRoutes) {
            const { blueprint, derivativeId } = Foundations.Blueprint.derive(
                AccountBlueprint,
                { resource: route.resource } as never,
            );

            assert.equal(derivativeId, `resource==${route.resource}`);
            assert.deepEqual(blueprint.outputs.map(output => output.id), [route.output]);
            assert.equal(Foundations.Blueprint.Schema.safeParse(blueprint).success, true);
        }
    });


    it("defaults to markets and perpetual account state", () => {
        const market = Foundations.Blueprint.derive(MarketBlueprint, {});
        const account = Foundations.Blueprint.derive(AccountBlueprint, {});

        assert.equal(market.derivativeId, "resource==markets");
        assert.deepEqual(market.blueprint.outputs.map(output => output.id), ["markets"]);
        assert.equal(account.derivativeId, "resource==state");
        assert.deepEqual(account.blueprint.outputs.map(output => output.id), ["state"]);
    });


    it("uses one terminal ToolList without regular resource fields", () => {
        for (const blueprint of [MarketBlueprint, AccountBlueprint]) {
            const derived = Foundations.Blueprint.derive(
                blueprint,
                { isConvertedToTool: true } as never,
            );

            assert.equal(derived.derivativeId, "isConvertedToTool==true");
            assert.deepEqual(derived.blueprint.outputs.map(output => output.id), ["tools"]);

            const fieldIds = derived.blueprint.fields
                .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
                .map(field => String(field.id));

            if (blueprint.id === MarketBlueprint.id)
                assert.deepEqual(fieldIds, []);
            else
                assert.deepEqual(fieldIds, ["address", "dex"]);
        }
    });


    it("exposes uniquely named tools", () => {
        const tools = [
            ...buildMarketTools({} as never),
            ...buildAccountTools({} as never, {}),
        ];
        const names = tools.map(tool => tool.name);

        assert.equal(new Set(names).size, names.length);
        assert.equal(names.every(name => name.startsWith("hyperliquid_")), true);
    });


    it("returns candles as a plain bounded list without a summary payload", async () => {
        const getCandles = buildMarketTools({
            candles: async () => [{
                openTime: 1_000, closeTime: 1_999, coin: "BTC", interval: "1h",
                open: "100", close: "101", high: "102", low: "99",
                volume: "10", trades: 5,
            }],
        } as never)[2] as unknown as {
            invoke(input: { coin: string }): Promise<string>;
        };

        const result = JSON.parse(await getCandles.invoke({ coin: "BTC" }));

        assert.deepEqual(Object.keys(result), ["count", "candles"]);
        assert.equal(result.count, 1);
        assert.equal(result.candles[0].coin, "BTC");
    });


    it("resolves inline derivatives through the catalogue", async () => {
        CatalogueService.setNodesRoot(nodesRoot);

        const market = await CatalogueService.resolveBlueprint(
            MarketBlueprint.id,
            { resource: "orderBook" } as never,
        );
        const account = await CatalogueService.resolveBlueprint(
            AccountBlueprint.id,
            { resource: "fills" } as never,
        );

        assert.deepEqual(market?.outputs.map(output => output.id), ["orderBook"]);
        assert.deepEqual(account?.outputs.map(output => output.id), ["fills"]);
    });
});
