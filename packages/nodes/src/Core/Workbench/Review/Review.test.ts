import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { CatalogueService, StandardFields } from "@pretzel-graph/node-sdk";
import { Foundations } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";

const routes = [
    { variant: "confirm", fields: ["approveLabel", "rejectLabel"],         outputs: ["approved", "rejected"] },
    { variant: "choice",  fields: ["options", "multiple", "allowCustom"], outputs: ["value"] },
    { variant: "form",    fields: ["formFields"],                           outputs: ["values"] },
] as const;

const nodesRoot = fileURLToPath(new URL("../../..", import.meta.url));

const ownFieldIds = (blueprint: Foundations.Blueprint) =>
    blueprint.fields
        .filter(field => !StandardFields.IDS.has(String(field.id)))
        .map(field => String(field.id));

describe("Workbench Review derivatives", () => {
    it("derives one valid field and output shape for every review mode", () => {
        for (const route of routes) {
            const { blueprint, derivativeId } = Foundations.Blueprint.derive(
                Blueprint,
                { variant: route.variant } as never,
            );

            assert.equal(derivativeId, `variant==${route.variant}`, route.variant);
            assert.deepEqual(
                ownFieldIds(blueprint),
                ["variant", "title", "message", "timeoutMs", ...route.fields],
                route.variant,
            );
            assert.deepEqual(
                blueprint.outputs.map(output => String(output.id)),
                route.outputs,
                route.variant,
            );
            assert.deepEqual(blueprint.inputs.map(input => String(input.id)), ["input"], route.variant);
            assert.equal(Foundations.Blueprint.Schema.safeParse(blueprint).success, true, route.variant);
            assert.equal("_derivatives" in blueprint, false, route.variant);
        }
    });

    it("defaults to the confirm derivative", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, {});

        assert.equal(derivativeId, "variant==confirm");
        assert.deepEqual(blueprint.outputs.map(output => String(output.id)), ["approved", "rejected"]);
    });

    it("marks the mode field as a derivative trigger automatically", () => {
        const variant = Blueprint.fields.find(field => String(field.id) === "variant");

        assert.equal(variant?.reconcile, true);
    });

    it("resolves its inline derivative through the catalogue", async () => {
        CatalogueService.setNodesRoot(nodesRoot);

        const result = await CatalogueService.resolveBlueprint(
            Blueprint.id,
            { variant: "choice" } as never,
        );

        assert.deepEqual(result?.outputs.map(output => String(output.id)), ["value"]);
        assert.equal(result?.fields.some(field => String(field.id) === "options"), true);
        assert.equal(result?.fields.some(field => String(field.id) === "formFields"), false);
    });
});
