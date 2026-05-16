import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const GoogleSearch = defineCredential({
    id: "googleSearchApi",
    displayName: "Google Search",
    icon: "Google",
    fields: [
        FieldBuilder.Password({ id: "apiKey", displayName: "API Key", required: true, tooltip: "Google Custom Search API key." }),
        FieldBuilder.String({ id: "searchEngineId", displayName: "Search Engine ID", required: true, initialValue: "", tooltip: "The cx parameter from your Programmable Search Engine." }),
    ],
})
