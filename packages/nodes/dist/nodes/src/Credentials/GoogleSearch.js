"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSearch = void 0;
const node_sdk_1 = require("../../../node-sdk/src/index.js");
exports.GoogleSearch = (0, node_sdk_1.defineCredential)({
    id: "googleSearchApi",
    displayName: "Google Search",
    icon: "Google",
    fields: [
        node_sdk_1.FieldBuilder.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Google Custom Search API key."
        }),
        node_sdk_1.FieldBuilder.String("searchEngineId", "Search Engine ID", {
            required: true,
            initialValue: "",
            tooltip: "The cx parameter from your Programmable Search Engine."
        }),
    ],
});
