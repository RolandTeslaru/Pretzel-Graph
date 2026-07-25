import { Foundations } from "@pretzel-graph/shared/domain";
import { InferReconcilingFieldValues, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

const asField = (b: unknown) => b as unknown as Foundations.Field;

const queryField = () => asField(FieldBuilder.Json("query", "Query", {
    initialValue: {},
    tooltip: "Filter document, e.g. { \"status\": \"active\" }."
}));
const limitField = () => asField(FieldBuilder.Integer("limit", "Limit", {
    initialValue: 50,
    min: 1
}));
const updateField = () => asField(FieldBuilder.Json("update", "Update", {
    initialValue: {},
    tooltip: "Fields to $set, e.g. { \"status\": \"archived\" }."
}));
const documentsField = () => asField(FieldBuilder.Json("documents", "Documents", {
    initialValue: [],
    tooltip: "Array of documents to insert."
}));

// Derives per-operation fields + result port from `operation`:
//   find → query+limit (DataList) | insert → documents | update → query+update | delete → query
// NOTE: reconcile-added fields aren't in InferReconcilingFieldValues, so onRun reads them via a cast.
const OP_FIELD_IDS = ["query", "limit", "update", "documents"] as Foundations.Field.Id[];

export const reconcile = (
    blueprint: Foundations.Blueprint,
    fieldValues: InferReconcilingFieldValues<typeof Blueprint>,
): Foundations.Blueprint => {
    const kept = blueprint.fields.filter(f => !OP_FIELD_IDS.includes(f.id));

    let opFields: Foundations.Field[];
    switch (fieldValues.operation) {
        case "insert": opFields = [documentsField()]; break;
        case "update": opFields = [queryField(), updateField()]; break;
        case "delete": opFields = [queryField()]; break;
        case "find":
        default:       opFields = [queryField(), limitField()]; break;
    }

    // find emits a DataList of documents; the write ops emit a single Data summary object.
    const resultOutput = fieldValues.operation === "find"
        ? OutputBuilder.DataList("result", "Documents", {
        tooltip: "Documents matched by the query — one item per document."
    })
        : OutputBuilder.Data("result", "Result", {
        tooltip: "Operation result summary."
    });

    // @ts-expect-error rebuild the readonly fields tuple
    blueprint.fields = [...kept, ...opFields];
    // @ts-expect-error swap the result output variant for this operation
    blueprint.outputs = [resultOutput];
    return blueprint;
};
