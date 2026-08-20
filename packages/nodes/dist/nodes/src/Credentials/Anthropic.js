"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Anthropic = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.Anthropic = (0, node_sdk_1.defineCredential)({
    id: "anthropicApi",
    displayName: "Anthropic",
    icon: "Anthropic",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKey", "API Key", {
            required: true
        }),
    ],
});
