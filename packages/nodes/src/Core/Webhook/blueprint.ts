import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Webhook } from "@pretzel-graph/shared/domain/Foundations/Webhook";
import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

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
            length: 32,
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
        FieldBuilder.MultiOption({
            id: "responseMode",
            displayName: "Response Mode",
            initialValue: "onReceived",
            variant: "select",
            options: [
                { value: "onReceived", displayName: "On Received" },
                { value: "workflowCompletion", displayName: "When Workflow Completes" },
                { value: "manual", displayName: "Manual" },
            ],
            tooltip: "Whether the webhook response should be sent immediately with an empty body, or delayed until the workflow finishes executing and includes a response payload.",
        }),
    ],
    inputs: [],
    webhooks: [
        {
            id: "req" as Webhook.Id,
            path: '${{ @thisNodeValues["path"] }}',
            method: '${{ @thisNodeValues["method"] }}',
            responseMode: '${{ @thisNodeValues["responseMode"] }}',
        }
    ],
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