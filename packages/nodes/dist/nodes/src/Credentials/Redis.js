"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Redis = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.Redis = (0, node_sdk_1.defineCredential)({
    id: "redis",
    displayName: "Redis",
    icon: "Redis",
    fields: [
        node_sdk_1.FieldBuilder.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        node_sdk_1.FieldBuilder.Integer("port", "Port", {
            required: true,
            initialValue: 6379
        }),
        node_sdk_1.FieldBuilder.String("username", "Username", {
            placeholder: "default",
            tooltip: "Optional Redis ACL username."
        }),
        node_sdk_1.FieldBuilder.Password("password", "Password", {}),
        node_sdk_1.FieldBuilder.Integer("db", "Database Index", {
            initialValue: 0
        }),
        node_sdk_1.FieldBuilder.Boolean("tls", "Use TLS", {
            initialValue: false,
            tooltip: "Enable TLS for discrete host and port credentials. A rediss:// URL enables TLS automatically."
        }),
    ],
});
