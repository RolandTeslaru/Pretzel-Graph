import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Redis } from "@pretzel-graph/nodes/Credentials/Redis";

export const Blueprint = defineBlueprint({
    id: "Integrations.Redis.Database",
    displayName: "Redis Database",
    description: "Runs bounded String, Key, and Hash operations against a Redis database.",
    icon: "Redis",
    accent: "utility",
    credentials: [Redis],
    fields: [
        FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "string", displayName: "String" },
                { value: "key", displayName: "Key" },
                { value: "hash", displayName: "Hash" },
            ],
            initialValue: "string",
            tooltip: "The Redis data structure to work with."
        }),
        FieldBuilder.String("key", "Key", {
            required: true,
            placeholder: "my:key"
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data("result", "Result", {
            tooltip: "The scalar, object, or command summary returned by Redis."
        }),
    ],

    "resource==string": {
        fields: [
            FieldBuilder.MultiOption("stringOperation", "Operation", {
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
                FieldBuilder.String("stringValue", "Value", {
                    multiline: true,
                    initialValue: ""
                }),
                FieldBuilder.Integer("stringTtl", "TTL (seconds)", {
                    initialValue: 0,
                    min: 0,
                    tooltip: "0 = no expiry."
                }),
            ],
        },

        "stringOperation==INCREMENT": {
            fields: [
                FieldBuilder.Integer("incrementAmount", "Amount", {
                    initialValue: 1,
                    min: 1,
                }),
            ],
        },

        "stringOperation==DECREMENT": {
            fields: [
                FieldBuilder.Integer("decrementAmount", "Amount", {
                    initialValue: 1,
                    min: 1,
                }),
            ],
        },
    },

    "resource==key": {
        fields: [
            FieldBuilder.MultiOption("keyOperation", "Operation", {
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
                FieldBuilder.Integer("expirySeconds", "TTL (seconds)", {
                    initialValue: 3600,
                    min: 1,
                }),
            ],
        },

        "keyOperation==TTL": {},
    },

    "resource==hash": {
        fields: [
            FieldBuilder.MultiOption("hashOperation", "Operation", {
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
                FieldBuilder.String("hashGetField", "Field", {
                    required: true,
                }),
            ],
        },

        "hashOperation==HSET": {
            fields: [
                FieldBuilder.String("hashSetField", "Field", {
                    required: true,
                }),
                FieldBuilder.String("hashSetValue", "Value", {
                    multiline: true,
                    initialValue: "",
                }),
            ],
        },

        "hashOperation==HGETALL": {},

        "hashOperation==HDELETE": {
            fields: [
                FieldBuilder.String("hashDeleteField", "Field", {
                    required: true,
                }),
            ],
        },
    },
});
