import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const OpenAI = defineCredential({
    id: "openAiApi",
    displayName: "OpenAI",
    icon: "OpenAI",
    fields: [
        FieldBuilder.Password("apiKey", "API Key", {
            required: true
        }),
        FieldBuilder.String("organizationId", "Organization ID", {
            initialValue: "",
            tooltip: "Optional. Found in your OpenAI account settings."
        }),
    ],
})
