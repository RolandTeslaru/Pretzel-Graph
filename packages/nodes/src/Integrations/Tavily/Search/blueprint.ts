import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk";
import { Tavily } from "@pretzel-graph/nodes/Credentials/Tavily";

const searchSettings = () => [
    FieldBuilder.Integer("maxResults", "Max Results", {
        initialValue: 5,
        min:          1,
        max:          20,
    }),
    FieldBuilder.MultiOption("searchDepth", "Search Depth", {
        options: [
            { value: "basic",    displayName: "Basic" },
            { value: "advanced", displayName: "Advanced" },
        ],
        initialValue: "basic",
        tooltip:     "Advanced costs more Tavily credits but returns richer results.",
    }),
    FieldBuilder.Boolean("includeAnswer", "Include Answer", {
        initialValue: false,
        tooltip:     "Tavily pre-summarizes an answer from the search results.",
    }),
] as const;

export const Blueprint = defineBlueprint({
    id:             "Integrations.Tavily.Search",
    credentials:    [Tavily],
    displayName:    "Tavily Search",
    description:    "Searches the web using Tavily and returns the results as documents.",
    icon:           "Tavily",
    accent:         "port-Retriever",
    toolCompatible: true,
    fields: [
        FieldBuilder.String("query", "Query", {
            required:    true,
            placeholder: "What do you want to search for?",
        }),
        ...searchSettings(),
    ],
    inputs:  [],
    outputs: [
        OutputBuilder.DataList("documents", "Documents", {
            tooltip: "Search results as Document objects (pageContent + metadata).",
        }),
    ],

    "isConvertedToTool==true": defineTool({
        fields: searchSettings(),
        inputs:  [],
        outputs: [
            OutputBuilder.Tool("tool", "Search Tool", {
                tooltip: "A tool that can be called to perform a search with the specified query.",
            }),
        ],
    }),
});
