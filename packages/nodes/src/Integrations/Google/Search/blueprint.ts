import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { GoogleSearch } from "@pretzel-graph/nodes/Credentials/GoogleSearch";

const fields = [
    FieldBuilder.Integer("maxResults", "Max Results", {
        initialValue: 5,
        min: 1,
        max: 10,
        tooltip: "Google Custom Search returns up to 10 results per request."
    }),
    FieldBuilder.MultiOption("searchType", "Search Type", {
        options: [
            { value: "web", displayName: "Web" },
            { value: "image", displayName: "Image" },
        ],

        initialValue: "web"
    }),
    FieldBuilder.MultiOption("safeSearch", "Safe Search", {
        options: [
            { value: "off", displayName: "Off" },
            { value: "active", displayName: "Active" },
        ],

        initialValue: "off"
    }),
];

export const Blueprint = defineBlueprint({
    id: "Integrations.Google.Search",
    credentials: [GoogleSearch],
    displayName: "Google Search",
    description: "Searches the web using Google Custom Search and returns the results as documents.",
    icon: "GoogleSearch",
    accent: "port-DataList",
    toolCompatible: true,
    fields,
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
    id: "Integrations.Google.Search",
    credentials: [GoogleSearch],
    displayName: "Google Search",
    description: "Searches the web using Google Custom Search and returns the results as documents.",
    icon: "GoogleSearch",
    accent: "port-Tool",
    toolCompatible: true,
    fields,
    inputs: [],
    outputs: [
        OutputBuilder.Tool("tool", "Search Tool", {
            tooltip: "A tool that can be called to perform a Google search with the specified query."
        }),
    ],
});
