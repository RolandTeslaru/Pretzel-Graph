import { defineBlueprint, defineTool, defineField, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.PretzelGraph.WorkbenchSDK",
    displayName: "Workbench SDK",
    description: "Reads and edits another workflow in this workspace — its nodes, edges, and field values.",
    icon: "PretzelGraphAppIcon",
    accent: "utility",
    toolCompatible: true,
    credentials: [],
    fields: [
        defineField.WorkflowIdSelector("workflowId", "Workflow", {
            required: true
        }),
        defineField.MultiOption("target", "Target", {
            options: [
                { value: "workflow", displayName: "Workflow" },
                { value: "node",     displayName: "Node" },
                { value: "edge",     displayName: "Edge" },
                { value: "field",    displayName: "Field" },
            ],
            initialValue: "workflow",
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.Data("result", "Result", {
            tooltip: "What the operation read or changed, with any validation issues it left behind.",
        }),
    ],

    "target==workflow": {
        fields: [
            defineField.MultiOption("workflowOperation", "Operation", {
                options: [
                    { value: "get",  displayName: "Get" },
                    { value: "meta", displayName: "Get meta" },
                ],
                initialValue: "get",
            }),
        ],
    },

    "target==node": {
        fields: [
            defineField.MultiOption("nodeOperation", "Operation", {
                options: [
                    { value: "get",    displayName: "Get" },
                    { value: "create", displayName: "Create" },
                    { value: "delete", displayName: "Delete" },
                ],
                initialValue: "get",
            }),
        ],
        "nodeOperation==get": {
            fields: [defineField.String("getNodeId", "Node", { required: true, placeholder: "node id" })],
        },
        "nodeOperation==create": {
            fields: [
                defineField.String("blueprintId", "Blueprint", { required: true, placeholder: "Core.Text.Input" }),
                defineField.Integer("positionX", "X", { initialValue: 0 }),
                defineField.Integer("positionY", "Y", { initialValue: 0 }),
                defineField.Json("staticValues", "Field values", {
                    initialValue: {},
                    tooltip: "Initial field values, keyed by field id.",
                }),
            ],
        },
        "nodeOperation==delete": {
            fields: [defineField.String("deleteNodeId", "Node", { required: true, placeholder: "node id" })],
        },
    },

    "target==edge": {
        fields: [
            defineField.MultiOption("edgeOperation", "Operation", {
                options: [
                    { value: "create", displayName: "Create" },
                    { value: "delete", displayName: "Delete" },
                ],
                initialValue: "create",
            }),
        ],
        "edgeOperation==create": {
            fields: [
                defineField.String("sourceNodeId", "Source node", { required: true }),
                defineField.String("sourcePortId", "Source port", { required: true }),
                defineField.String("targetNodeId", "Target node", { required: true }),
                defineField.String("targetPortId", "Target port", { required: true }),
            ],
        },
        "edgeOperation==delete": {
            fields: [defineField.String("edgeId", "Edge", { required: true, placeholder: "edge id" })],
        },
    },

    "target==field": {
        fields: [
            defineField.MultiOption("fieldOperation", "Operation", {
                options: [
                    { value: "get", displayName: "Get" },
                    { value: "set", displayName: "Set" },
                ],
                initialValue: "get",
            }),
            defineField.String("fieldNodeId", "Node", { required: true, placeholder: "node id" }),
            defineField.String("fieldId", "Field", { required: true, placeholder: "field id" }),
        ],
        "fieldOperation==get": {},
        "fieldOperation==set": {
            fields: [defineField.Json("fieldValue", "Value", { initialValue: null })],
        },
    },

    "isConvertedToTool==true": defineTool({
        fields: [
            defineField.WorkflowIdSelector("workflowId", "Workflow", {
                required: true,
                tooltip: "The workflow the tools read and edit. Edits are saved when the run completes.",
            }),
        ],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Workbench Tools")],
    }),
});
