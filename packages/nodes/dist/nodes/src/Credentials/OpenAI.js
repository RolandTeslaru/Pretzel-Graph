"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAI = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.OpenAI = (0, node_sdk_1.defineCredential)({
    id: "openAiApi",
    displayName: "OpenAI",
    icon: "OpenAI",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKey", "API Key", {
            required: true
        }),
        node_sdk_1.FieldBuilder.String("organizationId", "Organization ID", {
            initialValue: "",
            tooltip: "Optional. Found in your OpenAI account settings."
        }),
    ],
});
