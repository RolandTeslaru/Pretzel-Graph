"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Tavily_1 = require("../../../Credentials/Tavily");
const searchSettings = () => [
    node_sdk_1.FieldBuilder.Integer("maxResults", "Max Results", {
        initialValue: 5,
        min: 1,
        max: 20,
    }),
    node_sdk_1.FieldBuilder.MultiOption("searchDepth", "Search Depth", {
        options: [
            { value: "basic", displayName: "Basic" },
            { value: "advanced", displayName: "Advanced" },
        ],
        initialValue: "basic",
        tooltip: "Advanced costs more Tavily credits but returns richer results.",
    }),
    node_sdk_1.FieldBuilder.Boolean("includeAnswer", "Include Answer", {
        initialValue: false,
        tooltip: "Tavily pre-summarizes an answer from the search results.",
    }),
];
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Tavily.Search",
    credentials: [Tavily_1.Tavily],
    displayName: "Tavily Search",
    description: "Searches the web using Tavily and returns the results as documents.",
    icon: "Tavily",
    accent: "port-Retriever",
    toolCompatible: true,
    fields: [
        node_sdk_1.FieldBuilder.String("query", "Query", {
            required: true,
            placeholder: "What do you want to search for?",
        }),
        ...searchSettings(),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.DataList("documents", "Documents", {
            tooltip: "Search results as Document objects (pageContent + metadata).",
        }),
    ],
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: searchSettings(),
        inputs: [],
        outputs: [
            node_sdk_1.OutputBuilder.Tool("tool", "Search Tool", {
                tooltip: "A tool that can be called to perform a search with the specified query.",
            }),
        ],
    }),
});
