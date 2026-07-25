import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.IfElse",
    displayName: "If Else",
    description: "Routes input down one of two branches on a single true/false condition.",
    icon: "Split",
    accent: "group-routing",
    fields: [
        // Single boolean expression — pre-evaluated by evaluateFieldValues() to a real
        // boolean (coerced via the "Boolean" variant). Replaces the old condition tree.
        FieldBuilder.Boolean("condition", "Condition", {
            initialValue: true,
            isExpression: true
        }),
    ],
    inputs: [
        InputBuilder.Unresolved("input", "Input", {
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved("true", "True", {
            tooltip: "Output when condition is true.",
            polymorphicGroupId: "data"
        }),
        OutputBuilder.Unresolved("false", "False", {
            tooltip: "Output when condition is false.",
            polymorphicGroupId: "data"
        }),
    ],
});
