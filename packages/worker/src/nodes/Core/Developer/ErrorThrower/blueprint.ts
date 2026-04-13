import { defineBlueprint, FieldBuilder, InputBuilder } from "src/nodes/builders";

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
    outputs: [],
});
