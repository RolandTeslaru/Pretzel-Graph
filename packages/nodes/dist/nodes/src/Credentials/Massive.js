"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Massive = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.Massive = (0, node_sdk_1.defineCredential)({
    id: "massiveApi",
    displayName: "Massive",
    icon: "Massive",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Massive (Polygon.io) API key."
        }),
    ],
});
