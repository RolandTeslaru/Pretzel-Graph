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
        FieldBuilder.MultiOption("operation", "Operation", {
            options: [
                { value: "find",   displayName: "Find" },
                { value: "insert", displayName: "Insert" },
                { value: "update", displayName: "Update" },
                { value: "delete", displayName: "Delete" },
            ],

            initialValue: "find",
            tooltip: "The MongoDB operation to run."
        }),
        FieldBuilder.String("collection", "Collection", {
            required: true,
            placeholder: "users"
        }),
    ],
    inputs: [],
    outputs: [],

    "operation!=insert": {
        fields: [
            FieldBuilder.Json("query", "Query", {
                initialValue: {},
                tooltip: "Filter document, e.g. { \"status\": \"active\" }."
            }),
        ],

        "operation==find": {
            fields: [
                FieldBuilder.Integer("limit", "Limit", {
                    initialValue: 50,
                    min: 1
                }),
            ],
            outputs: [
                OutputBuilder.DataList("result", "Documents", {
                    tooltip: "Documents matched by the query — one item per document."
                }),
            ],
        },

        "operation==update": {
            fields: [
                FieldBuilder.Json("update", "Update", {
                    initialValue: {},
                    tooltip: "Fields to $set, e.g. { \"status\": \"archived\" }."
                }),
            ],
            outputs: [
                OutputBuilder.Data("result", "Result", {
                    tooltip: "Update result summary."
                }),
            ],
        },

        "operation==delete": {
            outputs: [
                OutputBuilder.Data("result", "Result", {
                    tooltip: "Delete result summary."
                }),
            ],
        },
    },

    "operation==insert": {
        fields: [
            FieldBuilder.Json("documents", "Documents", {
                initialValue: [],
                tooltip: "Array of documents to insert."
            }),
        ],
        outputs: [
            OutputBuilder.Data("result", "Result", {
                tooltip: "Insert result summary."
            }),
        ],
    },
});
