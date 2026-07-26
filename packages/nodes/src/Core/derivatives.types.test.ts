import "reflect-metadata"

import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk"
import type { InferFieldValues } from "@pretzel-graph/node-sdk"

const Cascade = defineBlueprint({
    id: "Test.Derivatives.Types", displayName: "T", description: "T", icon: "T",
    fields: [
        FieldBuilder.MultiOption("action", "Action", {
            options: [{ value: "search" }, { value: "list" }, { value: "get" }],
            initialValue: "search",
        }),
    ],
    inputs: [], outputs: [],

    "action==search": {
        fields:  [FieldBuilder.String("query", "Query", { required: true })],
        outputs: [OutputBuilder.DataList("markets", "Markets")],
    },
    "action==list": {
        fields: [FieldBuilder.MultiOption("listAPI", "Source", {
            options: [{ value: "gamma" }, { value: "data" }],
            initialValue: "gamma",
        })],

        "listAPI==data": {
            fields: [FieldBuilder.String("market", "Market", {})],
        },
    },
})

const Plain = defineBlueprint({
    id: "Test.Derivatives.Plain", displayName: "P", description: "P", icon: "P",
    fields: [FieldBuilder.String("name", "Name", {})],
    inputs: [InputBuilder.Data("in", "In")], outputs: [],
})


// Never called — every line is a compile-time assertion, so `tsc --noEmit` on this package
// is the real test. The runtime case below only guards against the file being dropped.
function _typeAssertions(
    values: InferFieldValues<typeof Cascade>,
    plain:  InferFieldValues<typeof Plain>,
) {
    if (values.action === "search") {
        const query: string = values.query
        // @ts-expect-error listAPI belongs to the action==list arm
        values.listAPI
        void query
    }

    if (values.action === "list") {
        // @ts-expect-error query belongs to the action==search arm
        values.query

        const api: "gamma" | "data" = values.listAPI

        if (values.listAPI === "data") {
            const market: string = values.market
            void market
        }
        void api
    }

    // "get" declares no branch, so the unmatched arm has to keep it legal.
    const unbranched: InferFieldValues<typeof Cascade> = { action: "get" } as never

    // Framework defaults survive on every arm.
    const signal: "AND" | "OR" | "XOR" = values.signalDependency

    // No condition keys — plain flat record, exactly as before derivatives existed.
    const name: string = plain.name

    void unbranched; void signal; void name
}


describe("derivative type narrowing", () => {

    it("emits the tree at runtime, and only when condition keys exist", () => {
        assert.equal(Cascade._derivatives?.length, 2)
        assert.equal(Plain._derivatives, undefined)
        void _typeAssertions
    })
})
