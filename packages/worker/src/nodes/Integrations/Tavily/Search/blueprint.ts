import { cloneDeep } from "lodash";
import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";
import { InferOutputs } from "src/types";

export const Blueprint = defineBlueprint({
    id: "Integrations.Tavily.Search",
    displayName: "Tavily Search",
    description: "Searches the web using Tavily and returns the results as documents.",
    icon: "Tavily",
    accent: "port-Retriever",
    toolCompatible: true,
    fields: [
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "API Key",
            tooltip: "Your Tavily API key. Falls back to TAVILY_API_KEY environment variable.",
        }),
        FieldBuilder.Integer({
            id: "maxResults",
            displayName: "Max Results",
            initialValue: 5,
            min: 1,
            max: 20,
        }),
        FieldBuilder.MultiOption({
            id: "searchDepth",
            displayName: "Search Depth",
            options: ["basic", "advanced"],
            initialValue: "basic",
            tooltip: "Advanced costs more Tavily credits but returns richer results.",
        }),
        FieldBuilder.Boolean({
            id: "includeAnswer",
            displayName: "Include Answer",
            initialValue: false,
            tooltip: "Tavily pre-summarizes an answer from the search results.",
        }),
    ],
    inputs: [
        InputBuilder.Text({
            id: "query",
            displayName: "Query",
            required: true,
            placeholder: "What do you want to search for?",
        }),
    ],
    outputs: [
        OutputBuilder.DataList({
            id: "documents",
            displayName: "Documents",
            tooltip: "Search results as Document objects (pageContent + metadata).",
        }),
    ],
});



export const ToolBlueprint = defineBlueprint({
    id: "Integrations.Tavily.Search",
    displayName: "Tavily Search",
    description: "Searches the web using Tavily and returns the results as documents.",
    icon: "Tavily",
    accent: "port-Retriever",
    toolCompatible: true,
    fields: [
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "API Key",
            tooltip: "Your Tavily API key. Falls back to TAVILY_API_KEY environment variable.",
        }),
        FieldBuilder.Integer({
            id: "maxResults",
            displayName: "Max Results",
            initialValue: 5,
            min: 1,
            max: 20,
        }),
        FieldBuilder.MultiOption({
            id: "searchDepth",
            displayName: "Search Depth",
            options: ["basic", "advanced"],
            initialValue: "basic",
            tooltip: "Advanced costs more Tavily credits but returns richer results.",
        }),
        FieldBuilder.Boolean({
            id: "includeAnswer",
            displayName: "Include Answer",
            initialValue: false,
            tooltip: "Tavily pre-summarizes an answer from the search results.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Tool({
            id: "tool",
            displayName: "Search Tool",
            tooltip: "A tool that can be called to perform a search with the specified query.",
        }),
    ],
});
