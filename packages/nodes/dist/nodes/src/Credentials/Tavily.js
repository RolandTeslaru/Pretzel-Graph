"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tavily = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.Tavily = (0, node_sdk_1.defineCredential)({
    id: "tavilyApi",
    displayName: "Tavily",
    icon: "Tavily",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKey", "API Key", {
            required: true
        }),
    ],
});
