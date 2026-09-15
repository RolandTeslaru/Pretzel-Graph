import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.ErrorThrower",
    displayName: "Error Thrower",
    description: "Throws a configured error when the node is executed.",
    icon: "Bug",
    accent: "utility",
    fields: [
        defineField.String("error", "Error", {
            initialValue: "Intentional error",
            multiline: true,
            placeholder: "Enter the error message to throw"
        }),
    ],
    inputs: [
        defineInput.Unresolved("trigger", "Trigger", {
            required: false,
            tooltip: "Optional trigger to execute this node and throw an error.",
            polymorphicGroupId: "signal"
        }),
    ],
    outputs: [
        defineOutput.Unresolved("result", "Result", {
            polymorphicGroupId: "signal",
            tooltip: "Never produced — the node always throws. Wire it to a Catch node to test error propagation."
        }),
    ],
});
