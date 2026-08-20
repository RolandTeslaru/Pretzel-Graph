"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Tavily_1 = require("../../../Credentials/Tavily");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Tavily.Retriever",
    displayName: "Tavily Retriever",
    description: "Configures a Tavily search retriever. Connect its output to a Search node or an agent.",
    icon: "Tavily",
    accent: "port-Retriever",
    credentials: [Tavily_1.Tavily],
    fields: [
        node_sdk_1.FieldBuilder.Integer("maxResults", "Max Results", {
            initialValue: 5,
            min: 1,
            max: 20
        }),
        node_sdk_1.FieldBuilder.MultiOption("searchDepth", "Search Depth", {
            options: [
                { value: "basic", displayName: "Basic" },
                { value: "advanced", displayName: "Advanced" },
            ],
            initialValue: "basic",
            tooltip: "Advanced costs more Tavily credits but returns richer results."
        }),
        node_sdk_1.FieldBuilder.Boolean("includeAnswer", "Include Answer", {
            initialValue: false,
            tooltip: "Tavily pre-summarizes an answer from the search results."
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Retriever("retriever", "Retriever", {}),
    ],
});
