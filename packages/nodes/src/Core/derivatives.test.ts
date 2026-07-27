import "reflect-metadata"

import assert from "node:assert/strict"
import { describe, it } from "node:test"

// Via the barrel, not the deep path — importing Foundations/Blueprint as the entry module
// trips a pre-existing init cycle (Field -> utils -> domain -> Workflow/node -> Blueprint).
import { Foundations } from "@pretzel-graph/shared/domain"
import { defineBlueprint, defineTool, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk"

const Blueprint = Foundations.Blueprint

const option = (value: string) => ({ value, displayName: value })

// Mirrors the Polymarket cascade: nested discriminants, per-leaf outputs, a ui override.
const Cascade = defineBlueprint({
    id:          "Test.Derivatives.Cascade",
    displayName: "Cascade",
    description: "Fixture.",
    icon:        "Test",
    fields: [
        FieldBuilder.MultiOption("action", "Action", {
            options:      [option("search"), option("list"), option("get")],
            initialValue: "search",
        }),
    ],
    inputs:  [],
    outputs: [],

    "action==search": {
        fields:  [FieldBuilder.String("query", "Query", { required: true })],
        outputs: [OutputBuilder.DataList("markets", "Markets")],
    },

    "action==list": {
        fields: [
            FieldBuilder.MultiOption("listAPI", "Source", {
                options:      [option("gamma"), option("data")],
                initialValue: "gamma",
            }),
        ],

        "listAPI==data": {
            fields:  [FieldBuilder.String("market", "Market", {})],
            outputs: [OutputBuilder.DataList("holders", "Holders")],
            ui:      { displayName: "Holders" },
        },
    },
})

const ids = (fields: readonly { id: unknown }[]) => fields.map(f => String(f.id))
const own = (fields: readonly { id: unknown }[]) =>
    ids(fields).filter(id => !FieldBuilder.DEFAULTS.IDS.has(id))


describe("blueprint derivatives", () => {

    it("keeps the tree off the base's flat members", () => {
        assert.deepEqual(own(Cascade.fields), ["action"])
        assert.deepEqual(Cascade.outputs, [])
        assert.equal(Cascade._derivatives?.length, 2)
    })

    it("derives discriminants from condition keys, not from hand-marking", () => {
        const discriminants = Cascade.fields
            .filter(f => f.reconcile && !FieldBuilder.DEFAULTS.IDS.has(String(f.id)))
            .map(f => String(f.id))

        // `action` is branched on at the root; nothing was wrapped in FieldBuilder.reconciling.
        assert.deepEqual(discriminants, ["action"])

        // A discriminant declared inside a branch and branched on deeper is stamped too —
        // otherwise the editor wouldn't re-derive when the user changes it.
        const listBranch = Cascade._derivatives!.find(d => d.condition.value === "list")!
        assert.equal(listBranch.fields!.find(f => String(f.id) === "listAPI")!.reconcile, true)

        // …but a plain field inside a branch is left alone.
        const dataBranch = listBranch._derivatives!.find(d => d.condition.value === "data")!
        assert.equal(dataBranch.fields!.find(f => String(f.id) === "market")!.reconcile, false)
    })

    it("falls back to initialValue, so the base derives to its default variant", () => {
        const { blueprint, derivativeId } = Blueprint.derive(Cascade as never, {})

        assert.equal(derivativeId, "action==search")
        assert.deepEqual(own(blueprint.fields), ["action", "query"])
        assert.deepEqual(ids(blueprint.outputs), ["markets"])
    })

    it("walks nested derivatives and accumulates down the path", () => {
        const { blueprint, derivativeId } = Blueprint.derive(
            Cascade as never,
            { action: "list", listAPI: "data" } as never,
        )

        assert.equal(derivativeId, "action==list/listAPI==data")
        assert.deepEqual(own(blueprint.fields), ["action", "listAPI", "market"])
        assert.deepEqual(ids(blueprint.outputs), ["holders"])
        assert.equal(blueprint.ui.displayName, "Holders")
    })

    it("stops at the depth the values reach", () => {
        const { blueprint, derivativeId } = Blueprint.derive(
            Cascade as never,
            { action: "list", listAPI: "gamma" } as never,
        )

        assert.equal(derivativeId, "action==list")
        assert.deepEqual(own(blueprint.fields), ["action", "listAPI"])
        assert.deepEqual(blueprint.outputs, [])
    })

    it("strips _derivatives so a derived blueprint can't be derived twice", () => {
        const { blueprint } = Blueprint.derive(Cascade as never, {})
        assert.equal((blueprint as { _derivatives?: unknown })._derivatives, undefined)
    })

    it("never mutates the base", () => {
        const before = own(Cascade.fields)
        Blueprint.derive(Cascade as never, { action: "list", listAPI: "data" } as never)

        assert.deepEqual(own(Cascade.fields), before)
        assert.deepEqual(Cascade.outputs, [])
    })

    // Regression: derive() joins sibling matches with the same "/" it uses for nesting, so a
    // path is a set of matched conditions, not a descent. Replaying it as a descent broke any
    // node that matched two branches at the same level.
    it("replays a path whose tokens are siblings, not a descent", () => {
        const Siblings = defineBlueprint({
            id: "Test.Derivatives.Siblings", displayName: "S", description: "S", icon: "S",
            fields: [
                FieldBuilder.MultiOption("mode", "Mode", {
                    options: [{ value: "a" }, { value: "b" }], initialValue: "a",
                }),
                FieldBuilder.Boolean("extra", "Extra", { initialValue: true }),
            ],
            inputs: [], outputs: [],

            "mode==a":      { outputs: [OutputBuilder.Data("fromMode", "From Mode")] },
            "extra==true":  { outputs: [OutputBuilder.Data("fromExtra", "From Extra")] },
        })

        const { blueprint, derivativeId } = Blueprint.derive(Siblings as never, {})

        assert.equal(derivativeId, "mode==a/extra==true")
        assert.deepEqual(ids(blueprint.outputs), ["fromMode", "fromExtra"])

        const replayed = Blueprint.deriveByPath(Siblings as never, derivativeId!)
        assert.deepEqual(ids(replayed.outputs), ["fromMode", "fromExtra"])
    })

    it("rejects a path token no derivative matches", () => {
        assert.throws(
            () => Blueprint.deriveByPath(Cascade as never, "action==list/nope==1"),
            /no derivative matching "nope==1"/,
        )
    })

    it("replays a path without field values", () => {
        const replayed = Blueprint.deriveByPath(Cascade as never, "action==list/listAPI==data")

        assert.deepEqual(own(replayed.fields), ["action", "listAPI", "market"])
        assert.deepEqual(ids(replayed.outputs), ["holders"])
    })


    describe("exclusivity", () => {

        // Two root-level discriminants that both match — the shape that produced the bloated
        // tool-mode ids, since `action` contributed tokens whose members were then replaced.
        const Exclusive = defineBlueprint({
            id:             "Test.Derivatives.Exclusive",
            displayName:    "Exclusive",
            description:    "Fixture.",
            icon:           "Test",
            toolCompatible: true,
            fields: [
                FieldBuilder.MultiOption("action", "Action", {
                    options:      [option("search"), option("list")],
                    initialValue: "search",
                }),
            ],
            inputs:  [],
            outputs: [],

            "action==search": {
                fields:  [FieldBuilder.String("query", "Query", {})],
                outputs: [OutputBuilder.DataList("markets", "Markets")],
                ui:      { icon: "Search" },
            },

            "isConvertedToTool==true": defineTool({
                fields:  [],
                inputs:  [],
                outputs: [OutputBuilder.ToolList("tools", "Tools")],
            }),
        })

        it("suppresses siblings, so their tokens stay out of the id", () => {
            const { blueprint, derivativeId } = Blueprint.derive(
                Exclusive as never,
                { action: "search", isConvertedToTool: true } as never,
            )

            assert.equal(derivativeId, "isConvertedToTool==true")
            assert.deepEqual(own(blueprint.fields), [])
            assert.deepEqual(ids(blueprint.outputs), ["tools"])
        })

        it("gives one id to one blueprint whatever the suppressed siblings say", () => {
            const forAction = (action: string) => Blueprint.derive(
                Exclusive as never,
                { action, isConvertedToTool: true } as never,
            ).derivativeId

            assert.equal(forAction("search"), forAction("list"))
        })

        it("does not leak a suppressed sibling's ui", () => {
            const { blueprint } = Blueprint.derive(
                Exclusive as never,
                { action: "search", isConvertedToTool: true } as never,
            )

            // action==search sets icon "Search", but it never runs — so the base icon stands.
            assert.equal((blueprint.ui as Record<string, unknown>).icon, "Test")
        })

        it("leaves non-exclusive derivations untouched", () => {
            const { derivativeId } = Blueprint.derive(Exclusive as never, { action: "search" } as never)

            assert.equal(derivativeId, "action==search")
        })

        it("still replays a pre-exclusivity id to the same blueprint", () => {
            // Ids persisted before exclusivity carry the suppressed tokens; deriveByPath replays
            // the set as given, and `replaces` still lands on the same result.
            const replayed = Blueprint.deriveByPath(
                Exclusive as never,
                "action==search/isConvertedToTool==true",
            )
            const { blueprint } = Blueprint.derive(
                Exclusive as never,
                { isConvertedToTool: true } as never,
            )

            assert.deepEqual(own(replayed.fields), own(blueprint.fields))
            assert.deepEqual(ids(replayed.outputs), ids(blueprint.outputs))
        })
    })


    describe("rejects at module load", () => {

        const base = {
            id: "Test.Derivatives.Invalid", displayName: "x", description: "x", icon: "x",
            fields: [FieldBuilder.MultiOption("mode", "Mode", {
                options: [option("a"), option("b")], initialValue: "a",
            })],
            inputs: [], outputs: [],
        } as const

        it("a literal outside the discriminant's options", () => {
            assert.throws(
                () => defineBlueprint({ ...base, "mode==zzz": { fields: [] } } as never),
                /is not one of mode's options/,
            )
        })

        it("a condition on an undeclared field", () => {
            assert.throws(
                () => defineBlueprint({ ...base, "nope==a": { fields: [] } } as never),
                /not declared at or above this level/,
            )
        })

        it("a field id declared twice across the tree", () => {
            assert.throws(
                () => defineBlueprint({
                    ...base,
                    "mode==a": { fields: [FieldBuilder.String("dupe", "Dupe", {})] },
                    "mode==b": { fields: [FieldBuilder.String("dupe", "Dupe", {})] },
                } as never),
                /duplicate field id "dupe"/,
            )
        })

        it("a nested condition targeting a sibling branch's field", () => {
            assert.throws(
                () => defineBlueprint({
                    ...base,
                    "mode==a": { fields: [FieldBuilder.String("onlyInA", "Only In A", {})] },
                    "mode==b": { "onlyInA==x": { fields: [] } },
                } as never),
                /not declared at or above this level/,
            )
        })

        it("two exclusive branches in one scope", () => {
            // Both could match at once, and unlike ordinary siblings they can't be overlaid.
            assert.throws(
                () => defineBlueprint({
                    ...base,
                    toolCompatible: true,
                    "mode==a":                 defineTool({ fields: [], inputs: [], outputs: [] }),
                    "isConvertedToTool==true": defineTool({ fields: [], inputs: [], outputs: [] }),
                } as never),
                /exclusive branches in one scope/,
            )
        })
    })
})
