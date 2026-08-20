"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mongo = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.Mongo = (0, node_sdk_1.defineCredential)({
    id: "mongoDb",
    displayName: "MongoDB",
    icon: "MongoDB",
    fields: [
        node_sdk_1.FieldBuilder.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        node_sdk_1.FieldBuilder.Integer("port", "Port", {
            tooltip: "Leave blank for Atlas (mongodb+srv); enter a port only for a direct mongodb connection."
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
        node_sdk_1.FieldBuilder.Boolean("tls", "Use TLS", {
            initialValue: false
        }),
    ],
});
