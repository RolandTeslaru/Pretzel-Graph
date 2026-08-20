"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Postgres = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.Postgres = (0, node_sdk_1.defineCredential)({
    id: "postgres",
    displayName: "Postgres",
    icon: "Postgres",
    fields: [
        node_sdk_1.FieldBuilder.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        node_sdk_1.FieldBuilder.Integer("port", "Port", {
            required: true,
            initialValue: 5432
        }),
        node_sdk_1.FieldBuilder.String("database", "Database", {
            required: true
        }),
        node_sdk_1.FieldBuilder.String("user", "User", {
            required: true
        }),
        node_sdk_1.FieldBuilder.Password("password", "Password", {
            required: true
        }),
        node_sdk_1.FieldBuilder.Boolean("ssl", "Use SSL", {
            initialValue: false
        }),
    ],
});
