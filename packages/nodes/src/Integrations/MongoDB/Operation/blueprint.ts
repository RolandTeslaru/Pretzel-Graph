import { defineBlueprint, defineField, defineOutput } from "@pretzel-graph/node-sdk";
import { Mongo } from "@pretzel-graph/nodes/Credentials/Mongo";

export const Blueprint = defineBlueprint({
    id: "Integrations.MongoDB.Operation",
    displayName: "MongoDB",
    description: "Runs an operation against a MongoDB collection.",
    icon: "MongoDB",
    accent: "utility",
    credentials: [Mongo],
    fields: [
        defineField.MultiOption("operation", "Operation", {
            options: [
                { value: "find",   displayName: "Find" },
                { value: "insert", displayName: "Insert" },
                { value: "update", displayName: "Update" },
                { value: "delete", displayName: "Delete" },
            ],

            initialValue: "find",
            tooltip: "The MongoDB operation to run."
        }),
        defineField.String("collection", "Collection", {
            required: true,
            placeholder: "users"
        }),
    ],
    inputs: [],
    outputs: [],

    "operation!=insert": {
        fields: [
            defineField.Json("query", "Query", {
                initialValue: {},
                tooltip: "Filter document, e.g. { \"status\": \"active\" }."
            }),
        ],

        "operation==find": {
            fields: [
                defineField.Integer("limit", "Limit", {
                    initialValue: 50,
                    min: 1
                }),
            ],
            outputs: [
                defineOutput.DataList("result", "Documents", {
                    tooltip: "Documents matched by the query — one item per document."
                }),
            ],
        },

        "operation==update": {
            fields: [
                defineField.Json("update", "Update", {
                    initialValue: {},
                    tooltip: "Fields to $set, e.g. { \"status\": \"archived\" }."
                }),
            ],
            outputs: [
                defineOutput.Data("result", "Result", {
                    tooltip: "Update result summary."
                }),
            ],
        },

        "operation==delete": {
            outputs: [
                defineOutput.Data("result", "Result", {
                    tooltip: "Delete result summary."
                }),
            ],
        },
    },

    "operation==insert": {
        fields: [
            defineField.Json("documents", "Documents", {
                initialValue: [],
                tooltip: "Array of documents to insert."
            }),
        ],
        outputs: [
            defineOutput.Data("result", "Result", {
                tooltip: "Insert result summary."
            }),
        ],
    },
});
