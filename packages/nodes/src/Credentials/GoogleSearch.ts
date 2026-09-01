import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const GoogleSearch = defineCredential({
    id: "googleSearchApi",
    displayName: "Google Search",
    icon: "GoogleSearch",
    fields: [
        FieldBuilder.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Google Custom Search API key."
        }),
        FieldBuilder.String("searchEngineId", "Search Engine ID", {
            required: true,
            initialValue: "",
            tooltip: "The cx parameter from your Programmable Search Engine."
        }),
    ],
})
