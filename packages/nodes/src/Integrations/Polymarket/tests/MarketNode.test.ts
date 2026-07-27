import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
    CatalogueService,
    FieldBuilder,
} from "@pretzel-graph/node-sdk";
import { Foundations } from "@pretzel-graph/shared/domain";

import { Blueprint } from "../Market/blueprint";
import { listMarkets } from "../Market/query";
import { buildTools } from "../Market/tools";


const routes = [
    { operation: "searchMarkets",      values: { action: "search", searchKind: "markets" },                                      output: "markets"      },
    { operation: "publicSearch",       values: { action: "search", searchKind: "public" },                                       output: "results"      },

    { operation: "listMarkets",        values: { action: "list", listAPI: "gamma", listGammaResource: "markets" },                output: "markets"      },
    { operation: "listEvents",         values: { action: "list", listAPI: "gamma", listGammaResource: "events" },                 output: "events"       },
    { operation: "listTags",           values: { action: "list", listAPI: "gamma", listGammaResource: "tags" },                   output: "tags"         },
    { operation: "listSeries",         values: { action: "list", listAPI: "gamma", listGammaResource: "series" },                 output: "series"       },
    { operation: "listComments",       values: { action: "list", listAPI: "gamma", listGammaResource: "comments" },               output: "comments"     },
    { operation: "listSports",         values: { action: "list", listAPI: "gamma", listGammaResource: "sports" },                 output: "sports"       },
    { operation: "listTeams",          values: { action: "list", listAPI: "gamma", listGammaResource: "teams" },                  output: "teams"        },
    { operation: "listTrades",         values: { action: "list", listAPI: "data",  listDataResource: "trades" },                  output: "trades"       },
    { operation: "listHolders",        values: { action: "list", listAPI: "data",  listDataResource: "holders" },                 output: "holders"      },

    { operation: "getMarket",          values: { action: "get", getAPI: "gamma", getGammaResource: "market" },                    output: "market"       },
    { operation: "getEvent",           values: { action: "get", getAPI: "gamma", getGammaResource: "event" },                     output: "event"        },
    { operation: "getTag",             values: { action: "get", getAPI: "gamma", getGammaResource: "tag" },                       output: "tag"          },
    { operation: "getSeries",          values: { action: "get", getAPI: "gamma", getGammaResource: "series" },                    output: "series"       },
    { operation: "getClobMarket",      values: { action: "get", getAPI: "clob",  getClobResource: "marketConfiguration" },        output: "market"       },
    { operation: "getOrderBook",       values: { action: "get", getAPI: "clob",  getClobResource: "orderBook" },                  output: "orderBook"    },
    { operation: "getMidpoint",        values: { action: "get", getAPI: "clob",  getClobResource: "midpoint" },                   output: "midpoint"     },
    { operation: "getPrice",           values: { action: "get", getAPI: "clob",  getClobResource: "price" },                      output: "price"        },
    { operation: "getSpread",          values: { action: "get", getAPI: "clob",  getClobResource: "spread" },                     output: "spread"       },
    { operation: "getLastTradePrice",  values: { action: "get", getAPI: "clob",  getClobResource: "lastTradePrice" },             output: "lastTrade"    },
    { operation: "getPriceHistory",    values: { action: "get", getAPI: "clob",  getClobResource: "priceHistory" },               output: "history"      },
    { operation: "getMarketMechanics", values: { action: "get", getAPI: "clob",  getClobResource: "mechanics" },                  output: "mechanics"    },
    { operation: "getMarketRewards",   values: { action: "get", getAPI: "clob",  getClobResource: "rewards" },                    output: "rewards"      },
    { operation: "getOpenInterest",    values: { action: "get", getAPI: "data",  getDataResource: "openInterest" },               output: "openInterest" },
    { operation: "getLiveVolume",      values: { action: "get", getAPI: "data",  getDataResource: "liveVolume" },                 output: "volume"       },
] as const;

type Route = typeof routes[number];

const nodesRoot = fileURLToPath(new URL("../../..", import.meta.url));

const deriveFor = (route: Route) =>
    Foundations.Blueprint.derive(
        Blueprint,
        { ...route.values, isConvertedToTool: false } as never,
    ).blueprint;


describe("Polymarket Market derivatives", () => {
    it("derives one focused and valid blueprint for every regular operation", () => {
        assert.equal(routes.length, 26);
        assert.equal(new Set(routes.map(route => route.operation)).size, routes.length);

        for (const route of routes) {
            const derived = deriveFor(route);

            assert.deepEqual(derived.inputs.map(input => input.id), [], route.operation);
            assert.deepEqual(derived.outputs.map(output => output.id), [route.output], route.operation);
            assert.equal(Foundations.Blueprint.Schema.safeParse(derived).success, true, route.operation);

            const fieldIds = derived.fields.map(field => String(field.id));
            assert.equal(new Set(fieldIds).size, fieldIds.length, route.operation);
            assert.equal(fieldIds.includes("action"), true, route.operation);
            assert.equal(fieldIds.includes("isConvertedToTool"), true, route.operation);
            assert.equal("_derivatives" in derived, false, route.operation);
        }
    });

    it("resolves the default selection through derivative initial values", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, {});

        assert.equal(derivativeId, "action==search/searchKind==markets");
        assert.deepEqual(
            blueprint.fields
                .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            [
                "action",
                "searchKind",
                "searchMarketsQuery",
                "searchMarketsStatus",
                "searchMarketsMaxResults",
            ],
        );
        assert.deepEqual(blueprint.outputs.map(output => output.id), ["markets"]);
    });

    it("marks every condition field as reconciling", () => {
        const conditionIds = new Set([
            "action",
            "searchKind",
            "listAPI",
            "listGammaResource",
            "listDataResource",
            "getAPI",
            "getGammaResource",
            "getClobResource",
            "getDataResource",
            "isConvertedToTool",
        ]);

        const walk = (
            derivatives: readonly Foundations.Blueprint.Derivative[] | undefined,
        ) => {
            for (const derivative of derivatives ?? []) {
                conditionIds.add(String(derivative.condition.fieldId));
                walk(derivative._derivatives);
            }
        };

        walk(Blueprint._derivatives);

        const allFields = [
            ...Blueprint.fields,
            ...routes.flatMap(route => deriveFor(route).fields),
        ];

        for (const fieldId of conditionIds) {
            const field = allFields.find(candidate => String(candidate.id) === fieldId);
            assert.equal(field?.reconcile, true, fieldId);
        }
    });

    it("keeps tool mode terminal and separate from regular operations", () => {
        const { blueprint } = Foundations.Blueprint.derive(
            Blueprint,
            { isConvertedToTool: true } as never,
        );

        assert.deepEqual(blueprint.outputs.map(output => output.id), ["tools"]);

        // Tool mode declares no node fields at all — every input is per-call intent and lives in a
        // tool's schema. Only the framework fields survive the replacement, so the node can still
        // be toggled back out of tool mode.
        assert.deepEqual(
            blueprint.fields
                .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            [],
        );
    });

    it("keeps credentials across tool mode", () => {
        // defineTool replaces fields/inputs/outputs but not credentials: a credential is never
        // per-call intent, and the proxy one is auto-attached by proxyCompatible rather than
        // authored here — replacing it would silently drop a proxy the author never declared.
        const credentialsFor = (values: object) =>
            Foundations.Blueprint
                .derive(Blueprint, values as never)
                .blueprint.credentials
                ?.map(credential => String(credential.id)) ?? [];

        assert.deepEqual(credentialsFor({}), ["networkProxy"]);
        assert.deepEqual(credentialsFor({ isConvertedToTool: true }), ["networkProxy"]);
    });

    it("exposes every operation as a distinct, uniquely named tool", () => {
        const tools = buildTools({} as never);
        const names = tools.map(builtTool => builtTool.name);

        assert.equal(tools.length, 23);
        assert.equal(new Set(names).size, names.length);

        // The API axis is run-mode structure — an agent asks for a market, it doesn't pick which
        // Polymarket service owns markets.
        for (const name of names)
            assert.ok(
                /^polymarket_/.test(name) && !/(gamma|clob|_data)/.test(name),
                `tool name leaks internal API structure: ${name}`,
            );
    });

    it("reconstructs the exact derivative from its identity", () => {
        const values = {
            action:          "get",
            getAPI:          "clob",
            getClobResource: "orderBook",
        } as const;
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, values as never);

        assert.ok(derivativeId);

        const replayed = Foundations.Blueprint.deriveByPath(Blueprint, derivativeId);

        assert.deepEqual(replayed.fields, blueprint.fields);
        assert.deepEqual(replayed.outputs, blueprint.outputs);
    });

    it("derives and caches through the catalogue without reconcile.ts", async () => {
        CatalogueService.setNodesRoot(nodesRoot);

        const result = await CatalogueService.reconcile(
            Blueprint.id,
            {
                action:          "get",
                getAPI:          "clob",
                getClobResource: "orderBook",
            } as never,
        );

        assert.deepEqual(result?.outputs.map(output => output.id), ["orderBook"]);
        assert.equal(
            result?.fields.some(field => String(field.id) === "getOrderBookTokenId"),
            true,
        );
    });

    it("presents compact selectors as tabs", () => {
        for (const route of routes.filter(route =>
            route.operation === "getMarket"
            || route.operation === "getEvent"
            || route.operation === "getTag"
        )) {
            const field = deriveFor(route).fields.find(candidate =>
                String(candidate.id).endsWith("LookupBy")
            );

            assert.equal(field?.variant, "MultiOption", route.operation);
            assert.equal((field as { kind?: string }).kind, "tab", route.operation);
        }
    });
});


describe("Polymarket Market queries", () => {
    it("combines open and closed Gamma pages for the all-markets status", async () => {
        const calls: unknown[] = [];
        const gamma = {
            markets: {
                list: async (request: unknown) => {
                    calls.push(request);
                    return [];
                },
            },
        };

        await listMarkets(gamma as never, "all", 20);

        assert.equal(calls.length, 2);
    });
});
