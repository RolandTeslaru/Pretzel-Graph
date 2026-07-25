import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

// `variant` drives the field schema + output ports via reconcile. Base (confirm) is
// variant + title + message + approve/reject labels → approved | rejected ports.
export const Blueprint = defineBlueprint({
    id: "Core.Workbench.Review",
    displayName: "Workbench Review",
    description: "Pauses the run and asks a human in the workbench to approve, choose, or fill a form.",
    icon: "ShieldQuestionMark",
    accent: "utility",
    fields: [
        FieldBuilder.reconciling(FieldBuilder.MultiOption("variant", "Mode", {
            options: [
                { value: "confirm", displayName: "Approve / Reject" },
                { value: "choice",  displayName: "Choice" },
                { value: "form",    displayName: "Form" },
            ],

            initialValue: "confirm",
            tooltip: "What the workbench dialog asks the human for."
        })),
        FieldBuilder.String("title", "Title", {
            placeholder: "Review required"
        }),
        FieldBuilder.String("message", "Message", {
            placeholder: "Approve this action?"
        }),
        FieldBuilder.Integer("timeoutMs", "Timeout (ms)", {
            initialValue: 24 * 60 * 60_000,
            min: 0,
            tooltip: "How long to wait for a response before the node times out."
        }),
        FieldBuilder.String("approveLabel", "Approve label", {
            initialValue: "Approve"
        }),
        FieldBuilder.String("rejectLabel", "Reject label", {
            initialValue: "Reject"
        }),
    ],
    inputs: [
        InputBuilder.Unresolved("input", "Input", {
            required: false,
            tooltip: "Optional data passed through on the chosen branch.",
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved("approved", "Approved", {
            tooltip: "Fires when the human approves.",
            polymorphicGroupId: "data"
        }),
        OutputBuilder.Unresolved("rejected", "Rejected", {
            tooltip: "Fires when the human rejects.",
            polymorphicGroupId: "data"
        }),
    ],
});
