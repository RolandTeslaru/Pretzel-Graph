import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Webhook } from "@pretzel-graph/shared/domain/Webhook";
import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Webhook",
    displayName: "Webhook",
    description: "Starts the workflow from inbound webhook requests.",
    icon: "Webhook",
    accent: "utility",
    fields: [
        FieldBuilder.UniqueString("path", "Path", {
            required: true,
            length: 32,
            placeholder: "webhook-abc123",
            tooltip: "Unique suffix appended to your webhook server base path."
        }),
        FieldBuilder.MultiOption("method", "HTTP Method", {
            initialValue: "POST",
            variant: "select",

            options: [
                { value: "GET" },
                { value: "POST" },
                { value: "PUT" },
                { value: "PATCH" },
                { value: "DELETE" },
            ],

            tooltip: "Method accepted by this webhook route."
        }),
        FieldBuilder.MultiOption("responseMode", "Response Mode", {
            initialValue: "onReceived",
            variant: "select",

            options: [
                { value: "onReceived", displayName: "On Received" },
                { value: "workflowCompletion", displayName: "When Workflow Completes" },
                { value: "manual", displayName: "Manual" },
            ],

            tooltip: "Whether the webhook response should be sent immediately with an empty body, or delayed until the workflow finishes executing and includes a response payload."
        }),
    ],
    inputs: [],
    webhooks: [
        {
            id: "req" as Webhook.Id,
            path: '${{ @fields["path"] }}',
            method: '${{ @fields["method"] }}',
            responseMode: '${{ @fields["responseMode"] }}',
        }
    ],
    outputs: [
        OutputBuilder.Data("body", "Body", {
            tooltip: "Webhook request body."
        }),
        OutputBuilder.Data("headers", "Headers", {
            tooltip: "Webhook request headers."
        }),
        OutputBuilder.Data("query", "Query", {
            tooltip: "Webhook query parameters."
        }),
        OutputBuilder.Data("params", "Params", {
            tooltip: "Webhook path parameters."
        }),
    ],
});
