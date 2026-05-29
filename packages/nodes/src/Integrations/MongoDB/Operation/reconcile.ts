import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFields, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { cloneDeep } from "lodash";

const queryField = () => FieldBuilder.Json({
    id: "query",
    displayName: "Query",
    initialValue: {},
    tooltip: "Filter document, e.g. { \"status\": \"active\" }.",
}) as unknown as Foundations.Field;

const limitField = () => FieldBuilder.Integer({
    id: "limit",
    displayName: "Limit",
    initialValue: 50,
    min: 1,
}) as unknown as Foundations.Field;

const updateField = () => FieldBuilder.Json({
    id: "update",
    displayName: "Update",
    initialValue: {},
    tooltip: "Fields to $set, e.g. { \"status\": \"archived\" }.",
}) as unknown as Foundations.Field;

const documentsField = () => FieldBuilder.Json({
    id: "documents",
    displayName: "Documents",
    initialValue: [],
    tooltip: "Array of documents to insert.",
}) as unknown as Foundations.Field;

/**
 * Swaps the per-operation fields when `operation` changes:
 *   - find   → query + limit
 *   - insert → documents
 *   - update → query + update
 *   - delete → query
 *
 * NOTE: fields added here are not in `InferFields<typeof Blueprint>`, so `onRun` reads them
 * via a cast (the documented reconcile/InferFields wrinkle).
 */
export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFields<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    const next = cloneDeep(blueprint);
    if (changedFieldId !== "operation") return next;

    const fields = new Map(next.fields.map(f => [f.id, f]));
    const op = ["query", "limit", "update", "documents"] as Foundations.Field.Id[];
    op.forEach(id => fields.delete(id));

    const add = (f: Foundations.Field) => fields.set(f.id, f);

    switch (newValue) {
        case "insert":
            add(documentsField());
            break;
        case "update":
            add(queryField());
            add(updateField());
            break;
        case "delete":
            add(queryField());
            break;
        case "find":
        default:
            add(queryField());
            add(limitField());
            break;
    }

    // find emits a DataList of documents; the write ops emit a single Data summary object.
    const resultOutput = newValue === "find"
        ? OutputBuilder.DataList({ id: "result", displayName: "Documents", tooltip: "Documents matched by the query — one item per document." })
        : OutputBuilder.Data({ id: "result", displayName: "Result", tooltip: "Operation result summary." });

    // @ts-expect-error rebuild the readonly fields tuple from the working map
    next.fields = [...fields.values()];
    // @ts-expect-error swap the result output variant for this operation
    next.outputs = [resultOutput];
    return next;
};
