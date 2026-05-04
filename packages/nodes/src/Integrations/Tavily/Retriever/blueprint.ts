import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.Tavily.Retriever",
    displayName: "Tavily Retriever",
    description: "Configures a Tavily search retriever. Connect its output to a Search node or an agent.",
    icon: "Tavily",
    accent: "port-Retriever",
    fields: [
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "API Key",
            required: true,
            tooltip: "Your Tavily API key.",
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
            options: [
                { value: "basic", displayName: "Basic" },
                { value: "advanced", displayName: "Advanced" },
            ],
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
        OutputBuilder.Retriever({
            id: "retriever",
            displayName: "Retriever",
        }),
    ],
});
