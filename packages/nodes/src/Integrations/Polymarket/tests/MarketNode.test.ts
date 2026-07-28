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
    { operation: "searchMarkets",   output: "markets"      },
    { operation: "search",          output: "results"      },

    { operation: "listMarkets",     output: "markets"      },
    { operation: "getMarket",       output: "market"       },
    { operation: "getMarketStats",  output: "stats"        },

    { operation: "listEvents",      output: "events"       },
    { operation: "getEvent",        output: "event"        },
    { operation: "getEventStats",   output: "stats"        },

    { operation: "listSeries",      output: "series"       },
    { operation: "getSeries",       output: "series"       },

    { operation: "listTags",        output: "tags"         },
    { operation: "getTag",          output: "tag"          },

    { operation: "listSports",      output: "sports"       },
    { operation: "listTeams",       output: "teams"        },
    { operation: "listComments",    output: "comments"     },

    { operation: "listTrades",      output: "trades"       },
    { operation: "listHolders",     output: "holders"      },

    { operation: "getPrice",        output: "price"        },
    { operation: "getOrderBook",    output: "orderBook"    },
    { operation: "getPriceHistory", output: "history"      },
    { operation: "getMechanics",    output: "mechanics"    },

    { operation: "getMarketConfig", output: "market"       },
    { operation: "getRewards",      output: "rewards"      },

    { operation: "getOpenInterest", output: "openInterest" },
    { operation: "getLiveVolume",   output: "volume"       },
] as const;

type Route = typeof routes[number];

const nodesRoot = fileURLToPath(new URL("../../..", import.meta.url));

const deriveFor = (route: Route) =>
    Foundations.Blueprint.derive(
        Blueprint,
        { resource: route.operation, isConvertedToTool: false } as never,
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
            assert.equal(fieldIds.includes("resource"), true, route.operation);
            assert.equal(fieldIds.includes("isConvertedToTool"), true, route.operation);
            assert.equal("_derivatives" in derived, false, route.operation);
        }
    });

    it("resolves the default selection through derivative initial values", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, {});

        assert.equal(derivativeId, "resource==searchMarkets");
        assert.deepEqual(
            blueprint.fields
                .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            [
                "resource",
                "searchMarketsQuery",
                "searchMarketsStatus",
                "searchMarketsMaxResults",
            ],
        );
        assert.deepEqual(blueprint.outputs.map(output => output.id), ["markets"]);
    });

    it("marks every condition field as reconciling", () => {
        // One axis now: the API level is gone, answered by PolymarketPublicSDK instead.
        const conditionIds = new Set([
            "resource",
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

        assert.equal(tools.length, 22);
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
        const values = { resource: "getOrderBook" } as const;
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
            { resource: "getOrderBook" } as never,
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
        for (const operation of ["getMarket", "getEvent", "getTag"] as const) {
            const fieldIds = Foundations.Blueprint
                .derive(Blueprint, { resource: operation } as never)
                .blueprint.fields.map(field => String(field.id));

            assert.equal(fieldIds.some(id => id.endsWith("LookupBy")), false, operation);
            assert.equal(fieldIds.some(id => id.endsWith("Identifier")), true, operation);
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
