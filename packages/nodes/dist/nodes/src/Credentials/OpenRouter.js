"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouter = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.OpenRouter = (0, node_sdk_1.defineCredential)({
    id: "openRouterApi",
    displayName: "OpenRouter",
    icon: "OpenRouter",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKey", "API Key", {
            required: true
        }),
    ],
});
