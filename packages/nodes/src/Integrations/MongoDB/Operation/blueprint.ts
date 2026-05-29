import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Mongo } from "@pretzel-graph/nodes/Credentials/Mongo";

export const Blueprint = defineBlueprint({
    id: "Integrations.MongoDB.Operation",
    displayName: "MongoDB",
    description: "Runs an operation against a MongoDB collection.",
    icon: "MongoDB",
    accent: "utility",
    credentials: [Mongo],
    fields: [
        // operation drives the field schema via reconcile. Base (find default) is
        // operation + collection + query + limit; other operations swap in their fields.
        FieldBuilder.MultiOption({
            id: "operation",
            displayName: "Operation",
            reconcile: true,
            options: [
                { value: "find",   displayName: "Find" },
                { value: "insert", displayName: "Insert" },
                { value: "update", displayName: "Update" },
                { value: "delete", displayName: "Delete" },
            ],
            initialValue: "find",
            tooltip: "The MongoDB operation to run.",
        }),
        FieldBuilder.String({
            id: "collection",
            displayName: "Collection",
            required: true,
            placeholder: "users",
        }),
        FieldBuilder.Json({
            id: "query",
            displayName: "Query",
            initialValue: {},
            tooltip: "Filter document, e.g. { \"status\": \"active\" }.",
        }),
        FieldBuilder.Integer({
            id: "limit",
            displayName: "Limit",
            initialValue: 50,
            min: 1,
        }),
    ],
    inputs: [],
    outputs: [
        // find (default) emits a DataList of documents. reconcile swaps this to a single
        // Data port for insert/update/delete (which return a summary object).
        OutputBuilder.DataList({
            id: "result",
            displayName: "Documents",
            tooltip: "Documents matched by the query — one item per document.",
        }),
    ],
});
