import {
    defineBlueprint,
    defineField,
    defineInput,
    defineOutput,
} from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id:          "Core.Workbench.Review",
    displayName: "Workbench Review",
    description: "Pauses the run and asks a human in the workbench to approve, choose, or fill a form.",
    icon:        "ShieldQuestionMark",
    accent:      "utility",
    fields: [
        defineField.MultiOption("variant", "Mode", {
            options: [
                { value: "confirm", displayName: "Approve / Reject" },
                { value: "choice",  displayName: "Choice" },
                { value: "form",    displayName: "Form" },
            ],
            initialValue: "confirm",
            tooltip:     "What the workbench dialog asks the human for.",
        }),
        defineField.String("title", "Title", {
            initialValue: "Review required",
            placeholder:  "Review required",
            required: true
        }),
        defineField.String("message", "Message", {
            initialValue: "Approve this action?",
            placeholder:  "Approve this action?",
            required: true
        }),
        defineField.Integer("timeoutMs", "Timeout (ms)", {
            initialValue: 60_000,
            min:          10_000,
            max:          10 * 60_000,
            tooltip:     "How long to wait for a response before the node times out.",
        }),
    ],
    inputs: [
        defineInput.Unresolved("input", "Input", {
            required:           false,
            tooltip:            "Optional data passed through on the chosen branch.",
            polymorphicGroupId: "data",
        }),
    ],
    outputs: [],

    "variant==confirm": {
        fields: [
            defineField.String("approveLabel", "Approve label", {
                initialValue: "Approve",
            }),
            defineField.String("rejectLabel", "Reject label", {
                initialValue: "Reject",
            }),
        ],
        outputs: [
            defineOutput.Unresolved("approved", "Approved", {
                tooltip:            "Fires when the human approves.",
                polymorphicGroupId: "data",
            }),
            defineOutput.Unresolved("rejected", "Rejected", {
                tooltip:            "Fires when the human rejects.",
                polymorphicGroupId: "data",
            }),
        ],
    },

    "variant==choice": {
        fields: [
            defineField.Json("options", "Options", {
                initialValue: [{ label: "Option 1", value: "1" }],
                tooltip:     "Array of { label, value }.",
            }),
            defineField.Boolean("multiple", "Allow multiple", {
                initialValue: false,
            }),
            defineField.Boolean("allowCustom", "Allow custom answer", {
                initialValue: false,
            }),
        ],
        outputs: [
            defineOutput.Data("value", "Value", {
                tooltip: "The chosen value(s).",
            }),
        ],
    },

    "variant==form": {
        fields: [
            defineField.Json("formFields", "Form fields", {
                initialValue: [],
                tooltip:     "Field definitions to render in the dialog.",
            }),
        ],
        outputs: [
            defineOutput.Data("values", "Values", {
                tooltip: "The collected form values.",
            }),
        ],
    },
});
