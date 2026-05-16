import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const OpenAI = defineCredential({
    id: "openAiApi",
    displayName: "OpenAI",
    icon: "OpenAI",
    fields: [
        FieldBuilder.Password({ id: "apiKey", displayName: "API Key", required: true }),
        FieldBuilder.String({ id: "organizationId", displayName: "Organization ID", initialValue: "", tooltip: "Optional. Found in your OpenAI account settings." }),
    ],
})
