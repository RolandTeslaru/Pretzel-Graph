"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Redis_1 = require("../../../Credentials/Redis");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Redis.Database",
    displayName: "Redis Database",
    description: "Runs bounded String, Key, and Hash operations against a Redis database.",
    icon: "Redis",
    accent: "utility",
    credentials: [Redis_1.Redis],
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "string", displayName: "String" },
                { value: "key", displayName: "Key" },
                { value: "hash", displayName: "Hash" },
            ],
            initialValue: "string",
            tooltip: "The Redis data structure to work with."
        }),
        node_sdk_1.FieldBuilder.String("key", "Key", {
            required: true,
            placeholder: "my:key"
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Data("result", "Result", {
            tooltip: "The scalar, object, or command summary returned by Redis."
        }),
    ],
    "resource==string": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("stringOperation", "Operation", {
                options: [
                    { value: "GET", displayName: "Get" },
                    { value: "SET", displayName: "Set" },
                    { value: "INCREMENT", displayName: "Increment" },
                    { value: "DECREMENT", displayName: "Decrement" },
                ],
                initialValue: "GET",
            }),
        ],
        "stringOperation==GET": {},
        "stringOperation==SET": {
            fields: [
                node_sdk_1.FieldBuilder.String("stringValue", "Value", {
                    multiline: true,
                    initialValue: ""
                }),
                node_sdk_1.FieldBuilder.Integer("stringTtl", "TTL (seconds)", {
                    initialValue: 0,
                    min: 0,
                    tooltip: "0 = no expiry."
                }),
            ],
        },
        "stringOperation==INCREMENT": {
            fields: [
                node_sdk_1.FieldBuilder.Integer("incrementAmount", "Amount", {
                    initialValue: 1,
                    min: 1,
                }),
            ],
        },
        "stringOperation==DECREMENT": {
            fields: [
                node_sdk_1.FieldBuilder.Integer("decrementAmount", "Amount", {
                    initialValue: 1,
                    min: 1,
                }),
            ],
        },
    },
    "resource==key": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("keyOperation", "Operation", {
                options: [
                    { value: "EXISTS", displayName: "Exists" },
                    { value: "DELETE", displayName: "Delete" },
                    { value: "EXPIRE", displayName: "Set Expiry" },
                    { value: "TTL", displayName: "Get TTL" },
                ],
                initialValue: "EXISTS",
            }),
        ],
        "keyOperation==EXISTS": {},
        "keyOperation==DELETE": {},
        "keyOperation==EXPIRE": {
            fields: [
                node_sdk_1.FieldBuilder.Integer("expirySeconds", "TTL (seconds)", {
                    initialValue: 3600,
                    min: 1,
                }),
            ],
        },
        "keyOperation==TTL": {},
    },
    "resource==hash": {
        fields: [
            node_sdk_1.FieldBuilder.MultiOption("hashOperation", "Operation", {
                options: [
                    { value: "HGET", displayName: "Get Field" },
                    { value: "HSET", displayName: "Set Field" },
                    { value: "HGETALL", displayName: "Get All" },
                    { value: "HDELETE", displayName: "Delete Field" },
                ],
                initialValue: "HGET",
            }),
        ],
        "hashOperation==HGET": {
            fields: [
                node_sdk_1.FieldBuilder.String("hashGetField", "Field", {
                    required: true,
                }),
            ],
        },
        "hashOperation==HSET": {
            fields: [
                node_sdk_1.FieldBuilder.String("hashSetField", "Field", {
                    required: true,
                }),
                node_sdk_1.FieldBuilder.String("hashSetValue", "Value", {
                    multiline: true,
                    initialValue: "",
                }),
            ],
        },
        "hashOperation==HGETALL": {},
        "hashOperation==HDELETE": {
            fields: [
                node_sdk_1.FieldBuilder.String("hashDeleteField", "Field", {
                    required: true,
                }),
            ],
        },
    },
});
