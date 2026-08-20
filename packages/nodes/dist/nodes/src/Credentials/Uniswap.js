"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uniswap = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.Uniswap = (0, node_sdk_1.defineCredential)({
    id: "uniswapApi",
    displayName: "Uniswap",
    icon: "Uniswap",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Uniswap Trading API key."
        }),
        node_sdk_1.FieldBuilder.Password("privateKey", "EVM Private Key", {
            required: true,
            tooltip: "Private key used to sign approvals and swap transactions."
        }),
    ],
});
