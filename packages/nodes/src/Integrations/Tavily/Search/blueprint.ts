import { cloneDeep } from "lodash";
import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder, InferOutputs } from "@pretzel-graph/node-sdk";
import { Tavily } from "@pretzel-graph/nodes/Credentials/Tavily";

export const Blueprint = defineBlueprint({
    id: "Integrations.Tavily.Search",
    credentials: [Tavily],
    displayName: "Tavily Search",
    description: "Searches the web using Tavily and returns the results as documents.",
    icon: "Tavily",
    accent: "port-Retriever",
    toolCompatible: true,
    fields: [
        FieldBuilder.Integer("maxResults", "Max Results", {
            initialValue: 5,
            min: 1,
            max: 20
        }),
        FieldBuilder.MultiOption("searchDepth", "Search Depth", {
            options: [
                { value: "basic", displayName: "Basic" },
                { value: "advanced", displayName: "Advanced" },
            ],

            initialValue: "basic",
            tooltip: "Advanced costs more Tavily credits but returns richer results."
        }),
        FieldBuilder.Boolean("includeAnswer", "Include Answer", {
            initialValue: false,
            tooltip: "Tavily pre-summarizes an answer from the search results."
        }),
    ],
    inputs: [
        InputBuilder.Text("query", "Query", {
            required: true,
            placeholder: "What do you want to search for?"
        }),
    ],
    outputs: [
        OutputBuilder.DataList("documents", "Documents", {
            tooltip: "Search results as Document objects (pageContent + metadata)."
        }),
    ],
});



export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Tavily.Search",
    credentials: [Tavily],
    displayName: "Tavily Search",
    description: "Searches the web using Tavily and returns the results as documents.",
    icon: "Tavily",
    accent: "port-Tool",
    toolCompatible: true,
    fields: [
        FieldBuilder.Integer("maxResults", "Max Results", {
            initialValue: 5,
            min: 1,
            max: 20
        }),
        FieldBuilder.MultiOption("searchDepth", "Search Depth", {
            options: [
                { value: "basic", displayName: "Basic" },
                { value: "advanced", displayName: "Advanced" },
            ],

            initialValue: "basic",
            tooltip: "Advanced costs more Tavily credits but returns richer results."
        }),
        FieldBuilder.Boolean("includeAnswer", "Include Answer", {
            initialValue: false,
            tooltip: "Tavily pre-summarizes an answer from the search results."
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Tool("tool", "Search Tool", {
            tooltip: "A tool that can be called to perform a search with the specified query."
        }),
    ],
});
