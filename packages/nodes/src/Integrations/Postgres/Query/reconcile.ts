import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues } from "@pretzel-graph/node-sdk";
import { cloneDeep } from "lodash";

/**
 * Mutates the node's field schema when the `operation` changes.
 *
 * Only "executeQuery" exists today — it needs just the `query` field, which is already in
 * the base blueprint, so this is effectively a pass-through. When select / insert / update /
 * upsert / delete are added, this is where their `schema` / `table` ResourceLoader fields
 * (and operation-specific fields) get added/removed based on `newValue`.
 *
 * NOTE: fields added here are NOT reflected in `InferFieldValues<typeof Blueprint>` (which is
 * derived from the static base blueprint). Loaders that read reconcile-added fields will
 * therefore need a cast at the `fieldValues` access site.
 */
export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFieldValues<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    const next = cloneDeep(blueprint);
    if (changedFieldId !== "operation") return next;

    const fields = new Map(next.fields.map(f => [f.id, f]));

    switch (newValue) {
        case "executeQuery":
        default:
            // executeQuery: query only — nothing extra to add.
            break;
    }

    // @ts-expect-error rebuild the readonly fields tuple from the working map
    next.fields = [...fields.values()];
    return next;
};
