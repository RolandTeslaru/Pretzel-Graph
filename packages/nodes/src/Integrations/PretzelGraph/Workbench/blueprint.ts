import { defineBlueprint, defineTool, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.PretzelGraph.Workbench",
    displayName: "Workbench",
    description: "Reads and edits another workflow in this workspace — its nodes, edges, and field values.",
    icon: "Pretzel",
    accent: "utility",
    toolCompatible: true,
    credentials: [],
    fields: [
        FieldBuilder.WorkflowIdSelector("workflowId", "Workflow", {
            required: true
        }),
        FieldBuilder.MultiOption("target", "Target", {
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
        OutputBuilder.Data("result", "Result", {
            tooltip: "What the operation read or changed, with any validation issues it left behind.",
        }),
    ],

    "target==workflow": {
        fields: [
            FieldBuilder.MultiOption("workflowOperation", "Operation", {
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
            FieldBuilder.MultiOption("nodeOperation", "Operation", {
                options: [
                    { value: "get",    displayName: "Get" },
                    { value: "create", displayName: "Create" },
                    { value: "delete", displayName: "Delete" },
                ],
                initialValue: "get",
            }),
        ],
        "nodeOperation==get": {
            fields: [FieldBuilder.String("getNodeId", "Node", { required: true, placeholder: "node id" })],
        },
        "nodeOperation==create": {
            fields: [
                FieldBuilder.String("blueprintId", "Blueprint", { required: true, placeholder: "Core.Text.Input" }),
                FieldBuilder.Integer("positionX", "X", { initialValue: 0 }),
                FieldBuilder.Integer("positionY", "Y", { initialValue: 0 }),
                FieldBuilder.Json("staticValues", "Field values", {
                    initialValue: {},
                    tooltip: "Initial field values, keyed by field id.",
                }),
            ],
        },
        "nodeOperation==delete": {
            fields: [FieldBuilder.String("deleteNodeId", "Node", { required: true, placeholder: "node id" })],
        },
    },

    "target==edge": {
        fields: [
            FieldBuilder.MultiOption("edgeOperation", "Operation", {
                options: [
                    { value: "create", displayName: "Create" },
                    { value: "delete", displayName: "Delete" },
                ],
                initialValue: "create",
            }),
        ],
        "edgeOperation==create": {
            fields: [
                FieldBuilder.String("sourceNodeId", "Source node", { required: true }),
                FieldBuilder.String("sourcePortId", "Source port", { required: true }),
                FieldBuilder.String("targetNodeId", "Target node", { required: true }),
                FieldBuilder.String("targetPortId", "Target port", { required: true }),
            ],
        },
        "edgeOperation==delete": {
            fields: [FieldBuilder.String("edgeId", "Edge", { required: true, placeholder: "edge id" })],
        },
    },

    "target==field": {
        fields: [
            FieldBuilder.MultiOption("fieldOperation", "Operation", {
                options: [
                    { value: "get", displayName: "Get" },
                    { value: "set", displayName: "Set" },
                ],
                initialValue: "get",
            }),
            FieldBuilder.String("fieldNodeId", "Node", { required: true, placeholder: "node id" }),
            FieldBuilder.String("fieldId", "Field", { required: true, placeholder: "field id" }),
        ],
        "fieldOperation==get": {},
        "fieldOperation==set": {
            fields: [FieldBuilder.Json("fieldValue", "Value", { initialValue: null })],
        },
    },

    "isConvertedToTool==true": defineTool({
        fields: [
            FieldBuilder.WorkflowIdSelector("workflowId", "Workflow", {
                required: true,
                tooltip: "The workflow the tools read and edit. Edits are saved when the run completes.",
            }),
        ],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Workbench Tools")],
    }),
});
