import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const OpenAI = defineCredential({
    id: "openAiApi",
    displayName: "OpenAI",
    icon: "OpenAI",
    fields: [
        defineField.Password("apiKey", "API Key", {
            required: true
        }),
        defineField.String("organizationId", "Organization ID", {
            initialValue: "",
            tooltip: "Optional. Found in your OpenAI account settings."
        }),
    ],
})
