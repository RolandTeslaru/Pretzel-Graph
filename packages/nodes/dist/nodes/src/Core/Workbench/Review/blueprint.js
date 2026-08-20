"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Workbench.Review",
    displayName: "Workbench Review",
    description: "Pauses the run and asks a human in the workbench to approve, choose, or fill a form.",
    icon: "ShieldQuestionMark",
    accent: "utility",
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("variant", "Mode", {
            options: [
                { value: "confirm", displayName: "Approve / Reject" },
                { value: "choice", displayName: "Choice" },
                { value: "form", displayName: "Form" },
            ],
            initialValue: "confirm",
            tooltip: "What the workbench dialog asks the human for.",
        }),
        node_sdk_1.FieldBuilder.String("title", "Title", {
            initialValue: "Review required",
            placeholder: "Review required",
            required: true
        }),
        node_sdk_1.FieldBuilder.String("message", "Message", {
            initialValue: "Approve this action?",
            placeholder: "Approve this action?",
            required: true
        }),
        node_sdk_1.FieldBuilder.Integer("timeoutMs", "Timeout (ms)", {
            initialValue: 60_000,
            min: 10_000,
            max: 10 * 60_000,
            tooltip: "How long to wait for a response before the node times out.",
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.Unresolved("input", "Input", {
            required: false,
            tooltip: "Optional data passed through on the chosen branch.",
            polymorphicGroupId: "data",
        }),
    ],
    outputs: [],
    "variant==confirm": {
        fields: [
            node_sdk_1.FieldBuilder.String("approveLabel", "Approve label", {
                initialValue: "Approve",
            }),
            node_sdk_1.FieldBuilder.String("rejectLabel", "Reject label", {
                initialValue: "Reject",
            }),
        ],
        outputs: [
            node_sdk_1.OutputBuilder.Unresolved("approved", "Approved", {
                tooltip: "Fires when the human approves.",
                polymorphicGroupId: "data",
            }),
            node_sdk_1.OutputBuilder.Unresolved("rejected", "Rejected", {
                tooltip: "Fires when the human rejects.",
                polymorphicGroupId: "data",
            }),
        ],
    },
    "variant==choice": {
        fields: [
            node_sdk_1.FieldBuilder.Json("options", "Options", {
                initialValue: [{ label: "Option 1", value: "1" }],
                tooltip: "Array of { label, value }.",
            }),
            node_sdk_1.FieldBuilder.Boolean("multiple", "Allow multiple", {
                initialValue: false,
            }),
            node_sdk_1.FieldBuilder.Boolean("allowCustom", "Allow custom answer", {
                initialValue: false,
            }),
        ],
        outputs: [
            node_sdk_1.OutputBuilder.Data("value", "Value", {
                tooltip: "The chosen value(s).",
            }),
        ],
    },
    "variant==form": {
        fields: [
            node_sdk_1.FieldBuilder.Json("formFields", "Form fields", {
                initialValue: [],
                tooltip: "Field definitions to render in the dialog.",
            }),
        ],
        outputs: [
            node_sdk_1.OutputBuilder.Data("values", "Values", {
                tooltip: "The collected form values.",
            }),
        ],
    },
});
