import {
    defineBlueprint,
    FieldBuilder,
    InputBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id:          "Core.Workbench.Review",
    displayName: "Workbench Review",
    description: "Pauses the run and asks a human in the workbench to approve, choose, or fill a form.",
    icon:        "ShieldQuestionMark",
    accent:      "utility",
    fields: [
        FieldBuilder.MultiOption("variant", "Mode", {
            options: [
                { value: "confirm", displayName: "Approve / Reject" },
                { value: "choice",  displayName: "Choice" },
                { value: "form",    displayName: "Form" },
            ],
            initialValue: "confirm",
            tooltip:     "What the workbench dialog asks the human for.",
        }),
        FieldBuilder.String("title", "Title", {
            placeholder: "Review required",
        }),
        FieldBuilder.String("message", "Message", {
            placeholder: "Approve this action?",
        }),
        FieldBuilder.Integer("timeoutMs", "Timeout (ms)", {
            initialValue: 24 * 60 * 60_000,
            min:          0,
            tooltip:     "How long to wait for a response before the node times out.",
        }),
    ],
    inputs: [
        InputBuilder.Unresolved("input", "Input", {
            required:           false,
            tooltip:            "Optional data passed through on the chosen branch.",
            polymorphicGroupId: "data",
        }),
    ],
    outputs: [],

    "variant==confirm": {
        fields: [
            FieldBuilder.String("approveLabel", "Approve label", {
                initialValue: "Approve",
            }),
            FieldBuilder.String("rejectLabel", "Reject label", {
                initialValue: "Reject",
            }),
        ],
        outputs: [
            OutputBuilder.Unresolved("approved", "Approved", {
                tooltip:            "Fires when the human approves.",
                polymorphicGroupId: "data",
            }),
            OutputBuilder.Unresolved("rejected", "Rejected", {
                tooltip:            "Fires when the human rejects.",
                polymorphicGroupId: "data",
            }),
        ],
    },

    "variant==choice": {
        fields: [
            FieldBuilder.Json("options", "Options", {
                initialValue: [{ label: "Option 1", value: "1" }],
                tooltip:     "Array of { label, value }.",
            }),
            FieldBuilder.Boolean("multiple", "Allow multiple", {
                initialValue: false,
            }),
            FieldBuilder.Boolean("allowCustom", "Allow custom answer", {
                initialValue: false,
            }),
        ],
        outputs: [
            OutputBuilder.Data("value", "Value", {
                tooltip: "The chosen value(s).",
            }),
        ],
    },

    "variant==form": {
        fields: [
            FieldBuilder.Json("formFields", "Form fields", {
                initialValue: [],
                tooltip:     "Field definitions to render in the dialog.",
            }),
        ],
        outputs: [
            OutputBuilder.Data("values", "Values", {
                tooltip: "The collected form values.",
            }),
        ],
    },
});
