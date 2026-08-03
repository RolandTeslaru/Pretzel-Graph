import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
    CatalogueService,
    FieldBuilder,
} from "@pretzel-graph/node-sdk";
import { Foundations } from "@pretzel-graph/shared/domain";

import { Polymarket } from "../domain";
import { PolymarketPublicSDK } from "../sdk";
import { Blueprint } from "../Market/blueprint";
import { buildTools } from "../Market/tools";


const routes = [
    { operation: "searchMarkets",   values: { action: "search", searchKind: "markets" },           output: "markets"      },
    { operation: "searchAll",       values: { action: "search", searchKind: "all" },               output: "results"      },

    { operation: "listMarkets",     values: { action: "list", listResource: "markets" },           output: "markets"      },
    { operation: "listEvents",      values: { action: "list", listResource: "events" },            output: "events"       },
    { operation: "listSeries",      values: { action: "list", listResource: "series" },            output: "series"       },
    { operation: "listTags",        values: { action: "list", listResource: "tags" },              output: "tags"         },
    { operation: "listSports",      values: { action: "list", listResource: "sports" },            output: "sports"       },
    { operation: "listTeams",       values: { action: "list", listResource: "teams" },             output: "teams"        },
    { operation: "listComments",    values: { action: "list", listResource: "comments" },          output: "comments"     },
    { operation: "listTrades",      values: { action: "list", listResource: "trades" },            output: "trades"       },
    { operation: "listHolders",     values: { action: "list", listResource: "holders" },           output: "holders"      },

    { operation: "getMarket",       values: { action: "get", getResource: "market" },              output: "market"       },
    { operation: "getMarketStats",  values: { action: "get", getResource: "marketStats" },         output: "stats"        },
    { operation: "getEvent",        values: { action: "get", getResource: "event" },               output: "event"        },
    { operation: "getEventStats",   values: { action: "get", getResource: "eventStats" },          output: "stats"        },
    { operation: "getSeries",       values: { action: "get", getResource: "series" },              output: "series"       },
    { operation: "getTag",          values: { action: "get", getResource: "tag" },                 output: "tag"          },
    { operation: "getPrice",        values: { action: "get", getResource: "price" },               output: "price"        },
    { operation: "getOrderBook",    values: { action: "get", getResource: "orderBook" },           output: "orderBook"    },
    { operation: "getPriceHistory", values: { action: "get", getResource: "priceHistory" },        output: "history"      },
    { operation: "getMechanics",    values: { action: "get", getResource: "mechanics" },           output: "mechanics"    },
    { operation: "getMarketConfig", values: { action: "get", getResource: "marketConfig" },        output: "market"       },
    { operation: "getRewards",      values: { action: "get", getResource: "rewards" },             output: "rewards"      },
    { operation: "getOpenInterest", values: { action: "get", getResource: "openInterest" },        output: "openInterest" },
    { operation: "getLiveVolume",   values: { action: "get", getResource: "liveVolume" },          output: "volume"       },
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
        assert.equal(routes.length, 25);
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

    it("marks every condition field as a derivative trigger", () => {
        // Two axes now: the API level is gone, answered by PolymarketPublicSDK instead.
        const conditionIds = new Set([
            "action",
            "searchKind",
            "listResource",
            "getResource",
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

        assert.deepEqual(
            blueprint.outputs.map(output => output.id),
            ["discoveryTools", "exchangeTools", "analyticsTools"],
        );

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
        const groups = buildTools({} as never);
        const tools  = Object.values(groups).flat();
        const names = tools.map(builtTool => builtTool.name);

        assert.deepEqual(
            Object.fromEntries(Object.entries(groups).map(([group, groupTools]) => [group, groupTools.length])),
            {
                discoveryTools: 12,
                exchangeTools:   6,
                analyticsTools:  6,
            },
        );
        assert.equal(tools.length, 24);
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
        const values = { action: "get", getResource: "orderBook" } as const;
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, values as never);

        assert.ok(derivativeId);

        const replayed = Foundations.Blueprint.deriveByPath(Blueprint, derivativeId);

        assert.deepEqual(replayed.fields, blueprint.fields);
        assert.deepEqual(replayed.outputs, blueprint.outputs);
    });

    it("derives and caches its inline blueprint branch", async () => {
        CatalogueService.setNodesRoot(nodesRoot);

        const result = await CatalogueService.resolveBlueprint(
            Blueprint.id,
            { action: "get", getResource: "orderBook" } as never,
        );

        assert.deepEqual(result?.outputs.map(output => output.id), ["orderBook"]);
        assert.equal(
            result?.fields.some(field => String(field.id) === "getOrderBookTokenId"),
            true,
        );
    });

    it("routes id or slug without asking which", () => {
        // The look-up-by selectors are gone: numeric ids and kebab-case slugs are distinguishable,
        // so the SDK picks the endpoint rather than the author declaring it.
        for (const resource of ["market", "event", "tag"] as const) {
            const fieldIds = Foundations.Blueprint
                .derive(Blueprint, { action: "get", getResource: resource } as never)
                .blueprint.fields.map(field => String(field.id));

            assert.equal(fieldIds.some(id => id.endsWith("LookupBy")), false, resource);
            assert.equal(fieldIds.some(id => id.endsWith("Identifier")), true, resource);
        }
    });
});


describe("Polymarket Market queries", () => {
    it("combines open and closed Gamma pages for the all-markets status", async () => {
        // "all" isn't a filter Gamma can express — it has independent `active` and `closed`
        // booleans — so the SDK has to fire two requests and merge them.
        const calls: unknown[] = [];
        const http = {
            create: () => ({
                get: async (_url: string, config?: { params?: unknown }) => {
                    calls.push(config?.params);
                    return [];
                },
            }),
        };

        await new PolymarketPublicSDK(http as never).markets.list({ status: "all", limit: 20 });

        assert.equal(calls.length, 2);
    });
});
