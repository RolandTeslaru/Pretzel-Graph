"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleGemini = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.GoogleGemini = (0, node_sdk_1.defineCredential)({
    id: "googleGeminiApi",
    displayName: "Google Gemini",
    icon: "GoogleGemini",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Google AI Studio API key."
        }),
    ],
});
