import { defineBlueprint, defineTool, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.PretzelGraph.ExecutionSDK",
    displayName: "Execution SDK",
    description: "Starts, steers, and inspects runs of other workflows in this workspace, as the user behind this run.",
    icon: "PretzelGraphAppIcon",
    accent: "utility",
    toolCompatible: true,
    credentials: [],
    fields: [
        FieldBuilder.MultiOption("action", "Action", {
            options: [
                { value: "run",       displayName: "Run" },
                { value: "pause",     displayName: "Pause" },
                { value: "resume",    displayName: "Resume" },
                { value: "suspend",   displayName: "Suspend" },
                { value: "terminate", displayName: "Terminate" },
                { value: "get",       displayName: "Get" },
            ],
            initialValue: "run",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data("result", "Result", {
            tooltip: "The run as started or read, or whether the signal was taken.",
        }),
    ],

    "action!=run": {
        fields: [
            FieldBuilder.String("executionId", "Execution", {
                required: true,
                placeholder: "execution id",
                tooltip: "The run to act on.",
            }),
        ],
    },

    "action==run": {
        fields: [
            FieldBuilder.String("proposedExecutionId", "Execution Id", {
                placeholder: "leave empty to let the run pick one",
                tooltip: "Pre-assign the new run's id, so it can be watched before it starts.",
                advanced: true,
            }),
            FieldBuilder.MultiOption("source", "Source", {
                variant: "tab",
                options: [
                    { value: "id",   displayName: "By Id" },
                    { value: "data", displayName: "By Data" },
                ],
                initialValue: "id",
                tooltip: "Run a workflow as it is saved, or a workflow object handed in on the input.",
            }),
            FieldBuilder.MultiOption("igniter", "Igniter", {
                variant: "tab",
                options: [
                    { value: "manual", displayName: "Manual" },
                    { value: "chat",   displayName: "Chat" },
                ],
                initialValue: "manual",
                tooltip: "How the run is started: as if from the editor, or as a message sent to the workflow's chat.",
            }),
            FieldBuilder.Boolean("record", "Record", { initialValue: false }),
        ],
        "igniter==chat": {
            fields: [
                FieldBuilder.String("chatMessage", "Message", {
                    required: true,
                    multiline: true,
                    placeholder: "What to say to the workflow",
                }),
                FieldBuilder.String("chatId", "Chat", {
                    placeholder: "chat id",
                    tooltip: "An existing chat to continue. Leave empty to start a new one.",
                }),
            ],
        },
        "source==id": {
            fields: [
                FieldBuilder.WorkflowIdSelector("workflowId", "Workflow", {
                    required: true,
                    tooltip: "The workflow to run, as it is saved.",
                }),
            ],
        },
        "source==data": {
            inputs: [
                InputBuilder.Data("workflow", "Workflow", {
                    required: true,
                    tooltip: "A workflow object — id and data — to run as given, without saving it.",
                }),
            ],
        },
    },

    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Execution Tools")],
    }),
});
