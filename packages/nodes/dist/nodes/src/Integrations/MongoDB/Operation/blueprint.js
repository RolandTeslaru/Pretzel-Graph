"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Mongo_1 = require("../../../Credentials/Mongo");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.MongoDB.Operation",
    displayName: "MongoDB",
    description: "Runs an operation against a MongoDB collection.",
    icon: "MongoDB",
    accent: "utility",
    credentials: [Mongo_1.Mongo],
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("operation", "Operation", {
            options: [
                { value: "find", displayName: "Find" },
                { value: "insert", displayName: "Insert" },
                { value: "update", displayName: "Update" },
                { value: "delete", displayName: "Delete" },
            ],
            initialValue: "find",
            tooltip: "The MongoDB operation to run."
        }),
        node_sdk_1.FieldBuilder.String("collection", "Collection", {
            required: true,
            placeholder: "users"
        }),
    ],
    inputs: [],
    outputs: [],
    "operation!=insert": {
        fields: [
            node_sdk_1.FieldBuilder.Json("query", "Query", {
                initialValue: {},
                tooltip: "Filter document, e.g. { \"status\": \"active\" }."
            }),
        ],
        "operation==find": {
            fields: [
                node_sdk_1.FieldBuilder.Integer("limit", "Limit", {
                    initialValue: 50,
                    min: 1
                }),
            ],
            outputs: [
                node_sdk_1.OutputBuilder.DataList("result", "Documents", {
                    tooltip: "Documents matched by the query — one item per document."
                }),
            ],
        },
        "operation==update": {
            fields: [
                node_sdk_1.FieldBuilder.Json("update", "Update", {
                    initialValue: {},
                    tooltip: "Fields to $set, e.g. { \"status\": \"archived\" }."
                }),
            ],
            outputs: [
                node_sdk_1.OutputBuilder.Data("result", "Result", {
                    tooltip: "Update result summary."
                }),
            ],
        },
        "operation==delete": {
            outputs: [
                node_sdk_1.OutputBuilder.Data("result", "Result", {
                    tooltip: "Delete result summary."
                }),
            ],
        },
    },
    "operation==insert": {
        fields: [
            node_sdk_1.FieldBuilder.Json("documents", "Documents", {
                initialValue: [],
                tooltip: "Array of documents to insert."
            }),
        ],
        outputs: [
            node_sdk_1.OutputBuilder.Data("result", "Result", {
                tooltip: "Insert result summary."
            }),
        ],
    },
});
