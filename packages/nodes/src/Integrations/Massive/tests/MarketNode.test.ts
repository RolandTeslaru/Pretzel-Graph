import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { CatalogueService, FieldBuilder } from "@pretzel-graph/node-sdk";
import { Foundations } from "@pretzel-graph/shared/domain";

import { Blueprint } from "../Market/blueprint";

const routes = [
    { action: "candles",      fields: ["timespan", "multiplier", "lookbackHours", "adjusted"], outputs: ["candles", "summary"] },
    { action: "snapshot",     fields: [],                                                       outputs: ["data"] },
    { action: "details",      fields: [],                                                       outputs: ["data"] },
    { action: "financials",   fields: ["timeframe", "limit"],                                 outputs: ["data"] },
    { action: "marketStatus", fields: [],                                                       outputs: ["data"] },
] as const;

const nodesRoot = fileURLToPath(new URL("../../..", import.meta.url));

const ownFieldIds = (blueprint: Foundations.Blueprint) =>
    blueprint.fields
        .filter(field => !FieldBuilder.DEFAULTS.IDS.has(String(field.id)))
        .map(field => String(field.id));

describe("Massive Market derivatives", () => {
    it("derives one valid blueprint for every workflow action", () => {
        for (const route of routes) {
            const { blueprint, derivativeId } = Foundations.Blueprint.derive(
                Blueprint,
                { action: route.action, isConvertedToTool: false } as never,
            );

            assert.equal(derivativeId, `action==${route.action}`, route.action);
            assert.deepEqual(ownFieldIds(blueprint), ["ticker", "action", ...route.fields], route.action);
            assert.deepEqual(blueprint.outputs.map(output => String(output.id)), route.outputs, route.action);
            assert.equal(Foundations.Blueprint.Schema.safeParse(blueprint).success, true, route.action);
            assert.equal("_derivatives" in blueprint, false, route.action);
        }
    });

    it("defaults to the candles derivative", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, {});

        assert.equal(derivativeId, "action==candles");
        assert.deepEqual(ownFieldIds(blueprint), [
            "ticker",
            "action",
            "timespan",
            "multiplier",
            "lookbackHours",
            "adjusted",
        ]);
        assert.deepEqual(blueprint.outputs.map(output => String(output.id)), ["candles", "summary"]);
    });

    it("keeps tool mode terminal and preserves credentials", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(
            Blueprint,
            { action: "financials", isConvertedToTool: true } as never,
        );

        assert.equal(derivativeId, "isConvertedToTool==true");
        assert.deepEqual(ownFieldIds(blueprint), ["timespan", "multiplier", "lookbackHours", "adjusted"]);
        assert.deepEqual(blueprint.outputs.map(output => String(output.id)), ["tools"]);
        assert.deepEqual(
            blueprint.credentials?.map(credential => String(credential.id)),
            ["massiveApi", "networkProxy"],
        );
        assert.equal(blueprint.ui.accent, "port-Tool");
    });

    it("resolves its inline derivative through the catalogue", async () => {
        CatalogueService.setNodesRoot(nodesRoot);

        const result = await CatalogueService.resolveBlueprint(
            Blueprint.id,
            { action: "financials" } as never,
        );

        assert.deepEqual(result?.outputs.map(output => String(output.id)), ["data"]);
        assert.equal(result?.fields.some(field => String(field.id) === "timeframe"), true);
        assert.equal(result?.fields.some(field => String(field.id) === "timespan"), false);
    });
});
