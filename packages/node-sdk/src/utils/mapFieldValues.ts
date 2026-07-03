import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues } from "../types";

export const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

// Join a (resolved) blueprint's fields against a node's staticValues, falling back to each
// field's initialValue. Pass the reconciled blueprint's fields to include reconcile-added fields.
export function mapFieldValues<T_Blueprint extends Foundations.Blueprint>(
    fields: readonly Foundations.Field[],
    staticValues: Record<Foundations.Field.Id, Foundations.Field.Value>,
): InferFieldValues<T_Blueprint> {
    const resolved: Record<Foundations.Field.Id, Foundations.Field.Value> = {};

    for (const field of fields) {
        const fieldId = field.id as Foundations.Field.Id;

        if (fieldId in staticValues)
            resolved[fieldId] = staticValues[fieldId] as Foundations.Field.Value;
        else
            resolved[fieldId] = field.initialValue as Foundations.Field.Value;
    }

    return resolved as InferFieldValues<T_Blueprint>
}
