import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues, FieldBuilder } from "@pretzel-graph/node-sdk";
import { cloneDeep } from "lodash";

/**
 * Mutates the node's field schema when `operation` changes:
 *   - SET    → reveals `value` (+ optional `ttl`)
 *   - GET    → key only
 *   - DELETE → key only
 *
 * NOTE: fields added here are NOT in `InferFieldValues<typeof Blueprint>` (derived from the static
 * base blueprint), so `onRun` reads `value` / `ttl` via a cast.
 */
export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFieldValues<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    const next = cloneDeep(blueprint);
    if (changedFieldId !== "operation") return next;

    const fields = new Map(next.fields.map(f => [f.id, f]));

    if (newValue === "SET") {
        fields.set("value" as Foundations.Field.Id, FieldBuilder.String({
            id: "value",
            displayName: "Value",
            multiline: true,
            initialValue: "",
        }) as unknown as Foundations.Field);
        fields.set("ttl" as Foundations.Field.Id, FieldBuilder.Integer({
            id: "ttl",
            displayName: "TTL (seconds)",
            initialValue: 0,
            tooltip: "0 = no expiry.",
        }) as unknown as Foundations.Field);
    } else {
        fields.delete("value" as Foundations.Field.Id);
        fields.delete("ttl" as Foundations.Field.Id);
    }

    // @ts-expect-error rebuild the readonly fields tuple from the working map
    next.fields = [...fields.values()];
    return next;
};
