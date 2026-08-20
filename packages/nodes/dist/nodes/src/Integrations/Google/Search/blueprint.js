"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const GoogleSearch_1 = require("../../../Credentials/GoogleSearch");
const queryField = node_sdk_1.FieldBuilder.String("query", "Query", {
    required: true,
    placeholder: "What do you want to search for?"
});
const searchSettings = () => [
    node_sdk_1.FieldBuilder.Integer("maxResults", "Max Results", {
        initialValue: 5,
        min: 1,
        max: 10,
        tooltip: "Google Custom Search returns up to 10 results per request."
    }),
    node_sdk_1.FieldBuilder.MultiOption("searchType", "Search Type", {
        options: [
            { value: "web", displayName: "Web" },
            { value: "image", displayName: "Image" },
        ],
        initialValue: "web"
    }),
    node_sdk_1.FieldBuilder.MultiOption("safeSearch", "Safe Search", {
        options: [
            { value: "off", displayName: "Off" },
            { value: "active", displayName: "Active" },
        ],
        initialValue: "off"
    }),
];
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Google.Search",
    credentials: [GoogleSearch_1.GoogleSearch],
    displayName: "Google Search",
    description: "Searches the web using Google Custom Search and returns the results as documents.",
    icon: "GoogleSearch",
    accent: "port-DataList",
    toolCompatible: true,
    fields: [queryField, ...searchSettings()],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.DataList("documents", "Documents", {
            tooltip: "Search results as Document objects (pageContent + metadata)."
        }),
    ],
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: searchSettings(),
        inputs: [],
        outputs: [
            node_sdk_1.OutputBuilder.Tool("tool", "Search Tool", {
                tooltip: "A tool that can be called to perform a Google search with the specified query."
            }),
        ],
    }),
});
