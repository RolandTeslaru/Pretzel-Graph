import { Foundations } from "@pretzel-graph/shared/domain";
import { InferReconcilingFieldValues, FieldBuilder } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

// SET reveals `value` (+ optional `ttl`); GET/DELETE are key-only (the base blueprint).
// NOTE: value/ttl are not in InferReconcilingFieldValues (base-derived), so onRun reads them via a cast.
export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferReconcilingFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {
    if (fieldValues.operation === "SET") {
        // @ts-expect-error append SET-only fields to the readonly tuple
        blueprint.fields = [...blueprint.fields,
            FieldBuilder.String("value", "Value", {
                multiline: true,
                initialValue: ""
            }),
            FieldBuilder.Integer("ttl", "TTL (seconds)", {
                initialValue: 0,
                tooltip: "0 = no expiry."
            }),
        ];
    }
    return blueprint;
};
