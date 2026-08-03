import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Foundations } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";

const ownFieldIds = (blueprint: Foundations.Blueprint) =>
    blueprint.fields
        .map(field => String(field.id))
        .filter(id => !["signalDependency", "dataDependency", "onErrorStrategy", "isConvertedToTool"].includes(id));

describe("Google Search blueprint derivatives", () => {
    it("keeps query and documents in run mode", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, {
            isConvertedToTool: false,
        } as never);

        assert.equal(derivativeId, null);
        assert.deepEqual(ownFieldIds(blueprint), ["query", "maxResults", "searchType", "safeSearch"]);
        assert.deepEqual(blueprint.outputs.map(output => String(output.id)), ["documents"]);
    });

    it("replaces the run shape with the terminal tool derivative", () => {
        const { blueprint, derivativeId } = Foundations.Blueprint.derive(Blueprint, {
            isConvertedToTool: true,
        } as never);

        assert.equal(derivativeId, "isConvertedToTool==true");
        assert.deepEqual(ownFieldIds(blueprint), ["maxResults", "searchType", "safeSearch"]);
        assert.deepEqual(blueprint.outputs.map(output => String(output.id)), ["tool"]);
        assert.equal(blueprint.ui.accent, "port-Tool");
        assert.equal(blueprint._derivatives, undefined);
    });
});
