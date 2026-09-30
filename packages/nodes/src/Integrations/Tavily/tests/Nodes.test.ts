import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Foundations } from "@pretzel-graph/shared/domain";

import { Blueprint as ExtractBlueprint } from "../Extract/blueprint";
import { Blueprint as ResearchBlueprint } from "../Research/blueprint";
import { Blueprint as SearchBlueprint } from "../Search/blueprint";


const outputIdsFor = (blueprint: Foundations.Blueprint, fieldValues: Record<string, unknown>) => {
    const derived = Foundations.Blueprint.derive(blueprint, fieldValues as never);

    assert.equal(Foundations.Blueprint.Schema.safeParse(derived.blueprint).success, true);

    return derived.blueprint.outputs.map(output => String(output.id));
};


describe("Tavily node blueprints", () => {

    it("adds Search's answer and images outputs only when they are switched on", () => {
        assert.deepEqual(outputIdsFor(SearchBlueprint, {}), ["documents"]);
        assert.deepEqual(outputIdsFor(SearchBlueprint, { answerMode: "basic" }), ["documents", "answer"]);
        assert.deepEqual(outputIdsFor(SearchBlueprint, { includeImages: true }), ["documents", "images"]);
        assert.deepEqual(
            outputIdsFor(SearchBlueprint, { answerMode: "advanced", includeImages: true }),
            ["documents", "answer", "images"],
        );
    });


    it("gives Research a report or a structured result", () => {
        assert.deepEqual(outputIdsFor(ResearchBlueprint, {}), ["report", "sources"]);
        assert.deepEqual(outputIdsFor(ResearchBlueprint, { outputFormat: "structured" }), ["result", "sources"]);
    });


    it("returns pages and failures from Extract", () => {
        assert.deepEqual(outputIdsFor(ExtractBlueprint, {}), ["pages", "failures"]);
    });


    it("turns every node into a single tool", () => {
        for (const blueprint of [SearchBlueprint, ExtractBlueprint, ResearchBlueprint])
            assert.deepEqual(outputIdsFor(blueprint, { isConvertedToTool: true, answerMode: "basic" }), ["tool"]);
    });
});
