"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Webhook",
    displayName: "Webhook",
    description: "Starts the workflow from inbound webhook requests.",
    icon: "Webhook",
    accent: "utility",
    igniter: true,
    fields: [
        node_sdk_1.FieldBuilder.UniqueString("path", "Path", {
            required: true,
            length: 32,
            placeholder: "webhook-abc123",
            tooltip: "Unique suffix appended to your webhook server base path."
        }),
        node_sdk_1.FieldBuilder.MultiOption("method", "HTTP Method", {
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
        // Hidden until the receiver honours it — it currently replies the same way regardless
        // of the mode, so offering the choice would promise behaviour that doesn't exist.
        // Re-enable together with the branch in webhook-igniter, and restore the expression
        // in the `webhooks` entry below.
        // FieldBuilder.MultiOption("responseMode", "Response Mode", {
        //     initialValue: "onReceived",
        //     variant: "select",
        //
        //     options: [
        //         { value: "onReceived", displayName: "On Received" },
        //         { value: "workflowCompletion", displayName: "When Workflow Completes" },
        //         { value: "manual", displayName: "Manual" },
        //     ],
        //
        //     tooltip: "Whether the webhook response should be sent immediately with an empty body, or delayed until the workflow finishes executing and includes a response payload."
        // }),
        node_sdk_1.FieldBuilder.Integer("testTimeoutMs", "Test Timeout (ms)", {
            initialValue: 30_000,
            min: 10_000,
            max: 10 * 60_000,
            tooltip: "How long a test run waits for an inbound request before giving up. Live webhooks are unaffected."
        }),
    ],
    inputs: [],
    webhooks: [
        (0, node_sdk_1.defineWebhook)({
            id: "req",
            path: '${{ @fields["path"] }}',
            method: '${{ @fields["method"] }}',
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Data("payload", "Payload", {
            tooltip: "The inbound request — method, path, headers, query and body."
        }),
    ],
});
