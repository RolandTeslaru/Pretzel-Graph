import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { CatalogueService, FieldBuilder } from "@pretzel-graph/node-sdk";
import { Foundations } from "@pretzel-graph/shared/domain";

import { MarketAction } from "../Market/actions";
import { Blueprint, ToolBlueprint } from "../Market/blueprint";
import { reconcile } from "../Market/reconcile";
import { runMarketAction, type MarketClients } from "../Market/run";

const conditionId = `0x${"a".repeat(64)}`;

const outputByAction = {
    searchMarkets:      "markets",
    listMarkets:        "markets",
    getMarket:          "market",
    listEvents:         "events",
    getEvent:           "event",
    publicSearch:       "results",
    listTags:           "tags",
    getTag:             "tag",
    listSeries:         "series",
    getSeries:          "series",
    listComments:       "comments",
    listSports:         "sports",
    listTeams:          "teams",
    listClobMarkets:    "page",
    getClobMarket:      "market",
    getOrderBook:       "orderBook",
    getMidpoint:        "midpoint",
    getPrice:           "price",
    getSpread:          "spread",
    getLastTradePrice:  "lastTrade",
    getPriceHistory:    "history",
    getMarketMechanics: "mechanics",
    listMarketActivity: "activity",
    getMarketRewards:   "rewards",
    listTrades:         "trades",
    listHolders:        "holders",
    getOpenInterest:    "openInterest",
    getLiveVolume:      "volume",
} satisfies Record<MarketAction.Operation.Type, string>;

const parameterFieldIdsByAction = {
    searchMarkets:      ["searchMarketsQuery"],
    listMarkets:        [],
    getMarket:          ["getMarketIdentifier"],
    listEvents:         [],
    getEvent:           ["getEventIdentifier"],
    publicSearch:       ["publicSearchQuery"],
    listTags:           [],
    getTag:             ["getTagIdentifier"],
    listSeries:         ["listSeriesSlug"],
    getSeries:          ["getSeriesIdentifier"],
    listComments:       ["listCommentsParentId"],
    listSports:         [],
    listTeams:          ["listTeamsName"],
    listClobMarkets:    [],
    getClobMarket:      ["getClobMarketConditionId"],
    getOrderBook:       ["getOrderBookTokenId"],
    getMidpoint:        ["getMidpointTokenId"],
    getPrice:           ["getPriceTokenId"],
    getSpread:          ["getSpreadTokenId"],
    getLastTradePrice:  ["getLastTradePriceTokenId"],
    getPriceHistory:    ["getPriceHistoryTokenId"],
    getMarketMechanics: ["getMarketMechanicsTokenId"],
    listMarketActivity: ["listMarketActivityConditionId"],
    getMarketRewards:   ["getMarketRewardsConditionId"],
    listTrades:         ["listTradesConditionId"],
    listHolders:        ["listHoldersConditionId"],
    getOpenInterest:    ["getOpenInterestConditionId"],
    getLiveVolume:      ["getLiveVolumeEventId"],
} satisfies Record<MarketAction.Operation.Type, string[]>;

const cloneBlueprint = () => structuredClone(Blueprint) as Foundations.Blueprint;

const routeFor = (operation: MarketAction.Operation.Type): MarketAction.Route => {
    const route = MarketAction.Routes.find(candidate => candidate.operation === operation);

    if (!route)
        throw new Error(`Missing Market route for ${operation}`);

    return route;
};

const reconcileFor = (route: MarketAction.Route) =>
    reconcile(cloneBlueprint(), { ...route.values, isConvertedToTool: false } as never);

const nodesRoot = fileURLToPath(new URL("../../..", import.meta.url));


describe("Polymarket Market reconciliation", () => {
    it("defines unique options for every cascading selector", () => {
        const selectors = [
            MarketAction.Options,
            MarketAction.SearchKind.Options,
            MarketAction.ListAPI.Options,
            MarketAction.ListGammaKind.Options,
            MarketAction.ListClobKind.Options,
            MarketAction.ListDataKind.Options,
            MarketAction.GetAPI.Options,
            MarketAction.GetGammaKind.Options,
            MarketAction.GetClobKind.Options,
            MarketAction.GetDataKind.Options,
        ];

        for (const options of selectors) {
            assert.equal(new Set(options.map(option => option.value)).size, options.length);

            for (const option of options) {
                assert.notEqual(option.displayName?.trim(), "");
                assert.notEqual(option.description?.trim(), "");
            }
        }

        assert.equal(MarketAction.Routes.length, 28);
        assert.equal(
            new Set(MarketAction.Routes.map(route => route.operation)).size,
            MarketAction.Routes.length,
        );

        for (const route of MarketAction.Routes)
            assert.equal(MarketAction.resolve(route.values), route.operation);
    });

    it("derives a valid, focused blueprint for every regular action", () => {
        for (const route of MarketAction.Routes) {
            const action = route.operation;
            const reconciled = reconcileFor(route);

            assert.deepEqual(reconciled.inputs.map(input => input.id), [], `${action} fixed inputs`);
            assert.deepEqual(
                reconciled.outputs.map(output => output.id),
                [outputByAction[action]],
                `${action} outputs`,
            );

            // Only the selectors on this branch of the cascade survive reconciliation.
            assert.deepEqual(
                reconciled.fields
                    .filter(field => field.reconcile && !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
                    .map(field => String(field.id)),
                Object.keys(route.values),
                `${action} reconcile fields`,
            );

            assert.equal(
                reconciled.fields.some(field => String(field.id) === "isConvertedToTool"),
                true,
                `${action} keeps the framework tool-mode field`,
            );

            for (const fieldId of parameterFieldIdsByAction[action]) {
                const field = reconciled.fields.find(candidate => String(candidate.id) === fieldId);

                assert.equal(field?.variant, "String", `${action}.${fieldId}`);
                assert.equal(
                    field && "isExpression" in field ? field.isExpression : undefined,
                    undefined,
                    `${action}.${fieldId} static by default`,
                );
            }

            assert.equal(
                Foundations.Blueprint.Schema.safeParse(reconciled).success,
                true,
                `${action} blueprint validity`,
            );
        }
    });

    // The un-reconciled base is what the canvas renders before any field changes, so it has to
    // already look like its own defaults rather than every selector at once.
    it("renders as its default branch before any reconciliation", () => {
        const own = (fields: readonly { id: unknown, hidden?: boolean }[], onlyVisible: boolean) => fields
            .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
            .filter(field => !onlyVisible || !field.hidden)
            .map(field => String(field.id));

        assert.deepEqual(
            own(Blueprint.fields, true),
            ["action", "searchKind", "searchMarketsQuery", "searchMarketsStatus", "searchMarketsMaxResults"],
        );

        const reconciled = reconcileFor(routeFor("searchMarkets"));

        assert.deepEqual(
            own(reconciled.fields, false),
            own(Blueprint.fields, true),
            "base field list matches its own reconciled default",
        );
        assert.deepEqual(
            reconciled.outputs.map(output => output.id),
            Blueprint.outputs.map(output => output.id),
            "base output matches its own reconciled default",
        );
    });

    it("emits no duplicate field ids on any branch", () => {
        for (const route of MarketAction.Routes) {
            const ids = reconcileFor(route).fields.map(field => String(field.id));
            assert.equal(new Set(ids).size, ids.length, route.operation);
        }
    });

    it("keeps the tool blueprint independent from regular actions", () => {
        const reconciled = reconcile(cloneBlueprint(), { isConvertedToTool: true } as never);

        assert.deepEqual(reconciled.outputs.map(output => output.id), ["tools"]);
        assert.deepEqual(
            reconciled.fields
                .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            ["status", "maxResults"],
        );
        assert.equal(reconciled.ui.accent, ToolBlueprint.ui.accent);
    });

    it("restores execution defaults after catalogue reconciliation", async () => {
        CatalogueService.setNodesRoot(nodesRoot);
        const route = routeFor("getOrderBook");

        const result = await CatalogueService.reconcile(
            Blueprint.id,
            { ...route.values, isConvertedToTool: false } as never,
        );

        assert.deepEqual(result?.outputs.map(output => output.id), ["orderBook"]);
        assert.equal(
            result?.fields.some(field => String(field.id) === "getOrderBookTokenId"),
            true,
        );
    });

    it("presents ID and slug lookup as tabs", () => {
        for (const operation of ["getMarket", "getEvent", "getTag"] as const) {
            const field = reconcileFor(routeFor(operation))
                .fields.find(candidate => String(candidate.id) === `${operation}LookupBy`);

            assert.equal(field?.variant, "MultiOption", operation);
            assert.equal((field as { kind?: string }).kind, "tab", operation);
        }
    });
});


function fieldsForAction(action: MarketAction.Operation.Type): Record<string, unknown> {
    const reconciled = reconcileFor(routeFor(action));
    const fields = Object.fromEntries(
        reconciled.fields.map(field => [String(field.id), field.initialValue]),
    );

    for (const field of reconciled.fields) {
        if (field.variant !== "String")
            continue;

        const id = String(field.id);

        if (id.endsWith("ConditionId"))
            fields[id] = conditionId;
        else if (id.endsWith("TokenId"))
            fields[id] = "token";
        else if (id.endsWith("Identifier") || id.endsWith("ParentId") || id.endsWith("EventId"))
            fields[id] = "1";
        else if (id.endsWith("Query") || id.endsWith("Slug") || id.endsWith("Name"))
            fields[id] = "election";
    }

    return fields;
}

function createClients() {
    const calls: string[] = [];
    const record = <T>(name: string, response: T) =>
        async (..._args: unknown[]) => {
            calls.push(name);
            return response;
        };

    const clients = {
        gamma: {
            markets: {
                list:      record("gamma.markets.list", []),
                getById:   record("gamma.markets.getById", { id: "1" }),
                getBySlug: record("gamma.markets.getBySlug", { slug: "market" }),
            },
            events: {
                list:      record("gamma.events.list", []),
                getById:   record("gamma.events.getById", { id: "1" }),
                getBySlug: record("gamma.events.getBySlug", { slug: "event" }),
            },
            search: {
                public: record("gamma.search.public", { events: [] }),
            },
            tags: {
                list:      record("gamma.tags.list", []),
                getById:   record("gamma.tags.getById", { id: "1" }),
                getBySlug: record("gamma.tags.getBySlug", { slug: "tag" }),
            },
            series: {
                list:    record("gamma.series.list", []),
                getById: record("gamma.series.getById", { id: "1" }),
            },
            comments: {
                list: record("gamma.comments.list", []),
            },
            sports: {
                list:      record("gamma.sports.list", []),
                listTeams: record("gamma.sports.listTeams", []),
            },
        },
        clob: {
            markets: {
                list:        record("clob.markets.list", { data: [] }),
                getClobInfo: record("clob.markets.getClobInfo", { condition_id: conditionId }),
            },
            marketData: {
                getOrderBook:      record("clob.marketData.getOrderBook", { bids: [], asks: [] }),
                getMidpoint:       record("clob.marketData.getMidpoint", { mid: "0.5" }),
                getPrice:          record("clob.marketData.getPrice", { price: "0.5" }),
                getSpread:         record("clob.marketData.getSpread", { spread: "0.1" }),
                getLastTradePrice: record("clob.marketData.getLastTradePrice", { price: "0.5", side: "BUY" }),
                getPriceHistory:   record("clob.marketData.getPriceHistory", []),
                getTickSize:       record("clob.marketData.getTickSize", "0.01"),
                getNegRisk:        record("clob.marketData.getNegRisk", false),
                getFeeRate:        record("clob.marketData.getFeeRate", 0),
                getFeeExponent:    record("clob.marketData.getFeeExponent", 0),
            },
            trades: {
                listMarketEvents: record("clob.trades.listMarketEvents", []),
            },
            rewards: {
                getMarket: record("clob.rewards.getMarket", []),
            },
        },
        data: {
            trades: {
                list: record("data.trades.list", []),
            },
            markets: {
                listHolders:     record("data.markets.listHolders", []),
                getOpenInterest: record("data.markets.getOpenInterest", []),
                getLiveVolume:   record("data.markets.getLiveVolume", []),
            },
        },
    } as unknown as MarketClients;

    return { calls, clients };
}


describe("Polymarket Market runtime", () => {
    it("routes every regular action through the expected result port", async () => {
        for (const { operation: action } of MarketAction.Routes) {
            const { calls, clients } = createClients();
            const result = await runMarketAction({
                action,
                clients,
                fields: fieldsForAction(action),
            });

            assert.equal(Object.hasOwn(result, outputByAction[action]), true, `${action} result port`);
            assert.equal(calls.length > 0, true, `${action} client call`);
        }
    });

    it("rejects missing required identifiers before calling a client", async () => {
        const { calls, clients } = createClients();

        await assert.rejects(
            runMarketAction({ action: "getOrderBook", clients, fields: {} }),
            /Token ID.*required/,
        );
        assert.deepEqual(calls, []);
    });

    it("combines open and closed Gamma pages for the all-markets status", async () => {
        const { calls, clients } = createClients();

        await runMarketAction({
            action: "listMarkets",
            clients,
            fields: {
                listMarketsStatus:     "all",
                listMarketsMaxResults: 20,
            },
        });

        assert.equal(calls.filter(call => call === "gamma.markets.list").length, 2);
    });
});
