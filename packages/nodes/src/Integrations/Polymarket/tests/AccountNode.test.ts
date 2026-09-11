import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { StandardFields } from "@pretzel-graph/node-sdk";
import { Foundations } from "@pretzel-graph/shared/domain";

import { Blueprint } from "../Account/blueprint";
import { buildTools } from "../Account/tools";
import { Polymarket } from "../domain";


const routes = [
    { operation: "openOrders",         values: { resource: "openOrders" },                                  output: "orders"      },
    { operation: "order",              values: { resource: "order" },                                       output: "order"       },
    { operation: "trades",             values: { resource: "trades" },                                      output: "trades"      },
    { operation: "collateralBalance",  values: { resource: "balance", balanceAssetType: "COLLATERAL" },      output: "balance"     },
    { operation: "conditionalBalance", values: { resource: "balance", balanceAssetType: "CONDITIONAL" },     output: "balance"     },
    { operation: "rewardEarnings",     values: { resource: "rewards", rewardsView: "earnings" },             output: "earnings"    },
    { operation: "rewardTotals",       values: { resource: "rewards", rewardsView: "totals" },               output: "totals"      },
    { operation: "rewardMarkets",      values: { resource: "rewards", rewardsView: "markets" },              output: "markets"     },
    { operation: "rewardPercentages",  values: { resource: "rewards", rewardsView: "percentages" },          output: "percentages" },
    { operation: "scoring",            values: { resource: "scoring" },                                      output: "scoring"     },
    { operation: "settings",           values: { resource: "settings" },                                     output: "settings"    },
] as const;

type Route = typeof routes[number];

const deriveFor = (route: Route) =>
    Foundations.Blueprint.derive(
        Blueprint,
        { ...route.values, isConvertedToTool: false } as never,
    ).blueprint;


describe("Polymarket Account derivatives", () => {
    it("derives one focused and valid blueprint for every regular operation", () => {
        assert.equal(new Set(routes.map(route => route.operation)).size, routes.length);

        for (const route of routes) {
            const derived = deriveFor(route);

            assert.deepEqual(derived.inputs.map(input => input.id), [], route.operation);
            assert.deepEqual(derived.outputs.map(output => output.id), [route.output], route.operation);
            assert.equal(Foundations.Blueprint.Schema.safeParse(derived).success, true, route.operation);

            const fieldIds = derived.fields.map(field => String(field.id));
            assert.equal(new Set(fieldIds).size, fieldIds.length, route.operation);
            assert.equal(fieldIds.includes("resource"), true, route.operation);
            assert.equal("_derivatives" in derived, false, route.operation);
        }
    });

    it("asks for a token id only when the balance is an outcome token", () => {
        const hasTokenField = (route: Route) =>
            deriveFor(route).fields.some(field => String(field.id) === "balanceTokenId");

        assert.equal(hasTokenField(routes.find(r => r.operation === "collateralBalance")!),  false);
        assert.equal(hasTokenField(routes.find(r => r.operation === "conditionalBalance")!), true);
    });

    it("resolves the default selection through derivative initial values", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, {});

        assert.equal(derivativeId, "resource==openOrders");
        assert.deepEqual(
            blueprint.fields
                .filter(field => !StandardFields.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            [
                "resource",
                "openOrdersConditionId",
                "openOrdersTokenId",
            ],
        );
        assert.deepEqual(blueprint.outputs.map(output => output.id), ["orders"]);
    });

    it("keeps tool mode terminal and separate from regular operations", () => {
        const { blueprint } = Foundations.Blueprint.derive(
            Blueprint,
            { isConvertedToTool: true } as never,
        );

        assert.deepEqual(blueprint.outputs.map(output => output.id), ["tools"]);
        assert.deepEqual(
            blueprint.fields
                .filter(field => !StandardFields.IDS.has(String(field.id)))
                .map(field => String(field.id)),
            [],
        );
    });

    it("keeps the API key credential across tool mode", () => {
        // The whole node is the credential — tool mode that dropped it would authenticate as
        // nobody and every tool would 401.
        const credentialsFor = (values: object) =>
            Foundations.Blueprint
                .derive(Blueprint, values as never)
                .blueprint.credentials
                ?.map(credential => String(credential.id)) ?? [];

        assert.ok(credentialsFor({}).includes("polymarketApiKey"));
        assert.ok(credentialsFor({ isConvertedToTool: true }).includes("polymarketApiKey"));
        assert.ok(credentialsFor({ isConvertedToTool: true }).includes("networkProxy"));
    });

    it("exposes every operation as a distinct, uniquely named tool", () => {
        const tools = buildTools({} as never);
        const names = tools.map(builtTool => builtTool.name);

        assert.equal(tools.length, 7);
        assert.equal(new Set(names).size, names.length);

        for (const name of names)
            assert.ok(
                /^polymarket_account_/.test(name),
                `tool name does not identify the node: ${name}`,
            );
    });

    it("takes no wallet argument — the credential decides whose account this is", () => {
        for (const builtTool of buildTools({} as never)) {
            const parameters = Object.keys(
                (builtTool.schema as { shape?: object }).shape ?? {},
            );

            for (const parameter of parameters)
                assert.equal(
                    /wallet|address|user/i.test(parameter),
                    false,
                    `${builtTool.name} accepts "${parameter}"`,
                );
        }
    });

    it("reconstructs the exact derivative from its identity", () => {
        const values = {
            resource:    "rewards",
            rewardsView: "markets",
        } as const;
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, values as never);

        assert.ok(derivativeId);

        const replayed = Foundations.Blueprint.deriveByPath(Blueprint, derivativeId);

        assert.deepEqual(replayed.fields, blueprint.fields);
        assert.deepEqual(replayed.outputs, blueprint.outputs);
    });
});


describe("Polymarket Account credential boundary", () => {
    it("rejects a signer address that is not a wallet", () => {
        assert.equal(
            Polymarket.CLOB.Common.WalletAddress.safeParse("0x56687bf447db6ffa42ffe2204a05edaa20f55839").success,
            true,
        );
        assert.equal(
            Polymarket.CLOB.Common.WalletAddress.safeParse("not-a-wallet").success,
            false,
        );

        // Trimmed, because it arrives from a pasted credential field.
        assert.equal(
            Polymarket.CLOB.Common.WalletAddress.parse("  0x56687bf447db6ffa42ffe2204a05edaa20f55839  "),
            "0x56687bf447db6ffa42ffe2204a05edaa20f55839",
        );
    });
});
