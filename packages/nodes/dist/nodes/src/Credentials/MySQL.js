"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQL = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.MySQL = (0, node_sdk_1.defineCredential)({
    id: "mysql",
    displayName: "MySQL",
    icon: "MySQL",
    fields: [
        node_sdk_1.FieldBuilder.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        node_sdk_1.FieldBuilder.Integer("port", "Port", {
            required: true,
            initialValue: 3306
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
