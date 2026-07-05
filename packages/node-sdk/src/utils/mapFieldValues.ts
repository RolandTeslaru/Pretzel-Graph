import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { InferFieldValues } from "../types";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/internal";

export const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

// Join a (resolved) blueprint's fields against a node's staticValues, falling back to each
// field's initialValue. Pass the reconciled blueprint's fields to include reconcile-added fields.
export function mapFieldValues<T_Blueprint extends Blueprint>(
    fields:       readonly Field[],
    staticValues: Record<Field.Id, Field.Value>,
): InferFieldValues<T_Blueprint> {
    const resolved: Record<Field.Id, Field.Value> = {};

    for (const field of fields) {
        const fieldId = field.id as Field.Id;

        if (fieldId in staticValues)
            resolved[fieldId] = staticValues[fieldId] as Field.Value;
        else
            resolved[fieldId] = field.initialValue as Field.Value;
    }

    return resolved as InferFieldValues<T_Blueprint>
}

// The reconcile-field subset of a values record — what a reconciler is allowed to see, matching the
// set createReconciledId hashes. Keeps the reconciler's inputs aligned with the cache key.
export function pickReconcilingValues(
    fields: readonly Field[],
    values: Record<Field.Id, Field.Value>,
): Record<Field.Id, Field.Value> {
    const out: Record<Field.Id, Field.Value> = {};
    for (const field of fields)
        if (field.reconcile) out[field.id] = coerceForVariant(field.variant, values[field.id]);
    return out;
}

// Reconciled-id round-trip stringifies values; coerce them back to the field's type so
// reconcilers that compare against typed literals (=== true, numeric ===) match.
function coerceForVariant(variant: Field.Variant, value: Field.Value): Field.Value {
    if (value === undefined || value === null) return value;
    switch (variant) {
        case "Boolean": return value === true || value === "true";
        case "Integer": return typeof value === "string" ? parseInt(value, 10) : value;
        case "Float":   return typeof value === "string" ? Number(value) : value;
        default:        return value;
    }
}
