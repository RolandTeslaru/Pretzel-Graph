"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xAI = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.xAI = (0, node_sdk_1.defineCredential)({
    id: "xAiApi",
    displayName: "xAI",
    icon: "xAI",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKey", "API Key", {
            required: true
        }),
    ],
});
