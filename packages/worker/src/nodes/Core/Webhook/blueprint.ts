import { defineBlueprint, FieldBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Webhook",
    displayName: "Webhook",
    description: "Starts the workflow from inbound webhook requests.",
    icon: "Webhook",
    accent: "utility",
    fields: [
        FieldBuilder.UniqueString({
            id: "path",
            displayName: "Path",
            required: true,
            prefix: "webhook-",
            length: 10,
            placeholder: "webhook-abc123",
            tooltip: "Unique suffix appended to your webhook server base path.",
        }),
        FieldBuilder.MultiOption({
            id: "method",
            displayName: "HTTP Method",
            initialValue: "POST",
            variant: "select",
            options: [
                { value: "GET" },
                { value: "POST" },
                { value: "PUT" },
                { value: "PATCH" },
                { value: "DELETE" },
            ],
            tooltip: "Method accepted by this webhook route.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data({
            id: "body",
            displayName: "Body",
            tooltip: "Webhook request body.",
        }),
        OutputBuilder.Data({
            id: "headers",
            displayName: "Headers",
            tooltip: "Webhook request headers.",
        }),
        OutputBuilder.Data({
            id: "query",
            displayName: "Query",
            tooltip: "Webhook query parameters.",
        }),
        OutputBuilder.Data({
            id: "params",
            displayName: "Params",
            tooltip: "Webhook path parameters.",
        }),
    ],
});