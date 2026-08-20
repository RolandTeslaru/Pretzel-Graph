"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kalshi = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.Kalshi = (0, node_sdk_1.defineCredential)({
    id: "kalshiApi",
    displayName: "Kalshi",
    icon: "Kalshi",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKeyId", "API Key ID", {
            required: true
        }),
        node_sdk_1.FieldBuilder.Password("privateKeyPem", "RSA Private Key (PEM)", {
            required: true
        }),
    ],
});
