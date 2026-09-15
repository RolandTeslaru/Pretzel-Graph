import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const GoogleSearch = defineCredential({
    id: "googleSearchApi",
    displayName: "Google Search",
    icon: "GoogleSearch",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true,
            tooltip: "Google Custom Search API key."
        }),
        defineField.String("searchEngineId", "Search Engine ID", {
            required: true,
            initialValue: "",
            tooltip: "The cx parameter from your Programmable Search Engine."
        }),
    ],
})
