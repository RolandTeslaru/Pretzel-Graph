import "reflect-metadata"

import assert from "node:assert/strict"
import { describe, it } from "node:test"

// Via the barrel, not the deep path — importing Foundations/Blueprint as the entry module
// trips a pre-existing init cycle (Field -> utils -> domain -> Workflow/node -> Blueprint).
import { Foundations } from "@pretzel-graph/shared/domain"
import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk"

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

    it("replays a path without field values", () => {
        const replayed = Blueprint.deriveByPath(Cascade as never, "action==list/listAPI==data")

        assert.deepEqual(own(replayed.fields), ["action", "listAPI", "market"])
        assert.deepEqual(ids(replayed.outputs), ["holders"])
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
    })
})
