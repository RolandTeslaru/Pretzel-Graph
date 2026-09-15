import { defineBlueprint, defineTool, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.PretzelGraph.ExecutionSDK",
    displayName: "Execution SDK",
    description: "Starts, steers, and inspects runs of other workflows in this workspace, as the user behind this run.",
    icon: "PretzelGraphAppIcon",
    accent: "utility",
    toolCompatible: true,
    credentials: [],
    fields: [
        defineField.MultiOption("action", "Action", {
            options: [
                { value: "run",       displayName: "Run" },
                { value: "pause",     displayName: "Pause" },
                { value: "resume",    displayName: "Resume" },
                { value: "suspend",   displayName: "Suspend" },
                { value: "terminate", displayName: "Terminate" },
                { value: "get",       displayName: "Get" },
                { value: "wait",      displayName: "Wait" },
            ],
            initialValue: "run",
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.Data("result", "Result", {
            tooltip: "The run as started or read, or whether the signal was taken.",
        }),
    ],

    "action!=run": {
        fields: [
            defineField.String("executionId", "Execution", {
                required: true,
                placeholder: "execution id",
                tooltip: "The run to act on.",
            }),
        ],
    },

    "action==wait": {
        fields: [
            defineField.Integer("waitTimeoutSeconds", "Timeout", {
                initialValue: 300,
                min: 1,
                max: 600,
                tooltip: "Seconds to hold for. Past it the run is returned as it is, still going.",
            }),
        ],
    },

    "action==run": {
        fields: [
            defineField.String("proposedExecutionId", "Execution Id", {
                placeholder: "leave empty to let the run pick one",
                tooltip: "Pre-assign the new run's id, so it can be watched before it starts.",
                advanced: true,
            }),
            defineField.MultiOption("source", "Source", {
                variant: "tab",
                options: [
                    { value: "id",   displayName: "By Id" },
                    { value: "data", displayName: "By Data" },
                ],
                initialValue: "id",
                tooltip: "Run a workflow as it is saved, or a workflow object handed in on the input.",
            }),
            defineField.MultiOption("igniter", "Igniter", {
                variant: "tab",
                options: [
                    { value: "manual", displayName: "Manual" },
                    { value: "chat",   displayName: "Chat" },
                ],
                initialValue: "manual",
                tooltip: "How the run is started: as if from the editor, or as a message sent to the workflow's chat.",
            }),
            defineField.Boolean("record", "Record", { initialValue: false }),
            defineField.Boolean("await", "Await", {
                initialValue: false,
                tooltip: "Hold until the run settles, then return it as it ended.",
            }),
        ],
        "await==true": {
            fields: [
                defineField.Integer("awaitTimeoutSeconds", "Timeout", {
                    initialValue: 300,
                    min: 1,
                    max: 600,
                    tooltip: "Seconds to hold for. Past it the run is returned as it is, still going.",
                }),
            ],
        },
        "igniter==chat": {
            fields: [
                defineField.String("chatMessage", "Message", {
                    required: true,
                    multiline: true,
                    placeholder: "What to say to the workflow",
                }),
                defineField.String("chatId", "Chat", {
                    placeholder: "chat id",
                    tooltip: "An existing chat to continue. Leave empty to start a new one.",
                }),
            ],
        },
        "source==id": {
            fields: [
                defineField.WorkflowIdSelector("workflowId", "Workflow", {
                    required: true,
                    tooltip: "The workflow to run, as it is saved.",
                }),
            ],
        },
        "source==data": {
            inputs: [
                defineInput.Data("workflow", "Workflow", {
                    required: true,
                    tooltip: "A workflow object — id and data — to run as given, without saving it.",
                }),
            ],
        },
    },

    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Execution Tools")],
    }),
});
