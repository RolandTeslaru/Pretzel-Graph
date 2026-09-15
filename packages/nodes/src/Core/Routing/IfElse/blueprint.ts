import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.IfElse",
    displayName: "If Else",
    description: "Routes input down one of two branches on a single true/false condition.",
    icon: "Split",
    accent: "group-routing",
    fields: [
        // Single boolean expression — pre-evaluated by evaluateFieldValues() to a real boolean
        // (coerced via the "Boolean" variant). Expression-only: a literal here would pin the
        // router to one branch forever.
        defineField.Boolean("condition", "Condition", {
            initialValue: true,
            only: "expression"
        }),
    ],
    inputs: [
        defineInput.Unresolved("input", "Input", {
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        defineOutput.Unresolved("true", "True", {
            tooltip: "Output when condition is true.",
            polymorphicGroupId: "data"
        }),
        defineOutput.Unresolved("false", "False", {
            tooltip: "Output when condition is false.",
            polymorphicGroupId: "data"
        }),
    ],
});
