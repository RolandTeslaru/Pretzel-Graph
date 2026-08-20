"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alpaca = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.Alpaca = (0, node_sdk_1.defineCredential)({
    id: "alpacaApi",
    displayName: "Alpaca",
    icon: "Alpaca",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKeyId", "API Key ID", {
            required: true
        }),
        node_sdk_1.FieldBuilder.Password("apiSecret", "API Secret", {
            required: true
        }),
        node_sdk_1.FieldBuilder.MultiOption("environment", "Trading Environment", {
            options: [
                { value: "paper", displayName: "Paper" },
                { value: "live", displayName: "Live" },
            ],
            initialValue: "paper",
            tooltip: "Paper and live accounts use different credentials. Existing credentials without this field are treated as paper.",
        }),
    ],
});
