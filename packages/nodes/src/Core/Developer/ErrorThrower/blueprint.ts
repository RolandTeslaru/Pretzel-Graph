import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.ErrorThrower",
    displayName: "Error Thrower",
    description: "Throws a configured error when the node is executed.",
    icon: "Bug",
    accent: "utility",
    fields: [
        FieldBuilder.String({
            id: "error",
            displayName: "Error",
            initialValue: "Intentional error",
            multiline: true,
            placeholder: "Enter the error message to throw",
        }),
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "trigger",
            displayName: "Trigger",
            required: false,
            tooltip: "Optional trigger to execute this node and throw an error.",
            polymorphicGroupId: "signal"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved({
            id: "result",
            displayName: "Result",
            polymorphicGroupId: "signal",
            tooltip: "Never produced — the node always throws. Wire it to a Catch node to test error propagation.",
        }),
    ],
});
