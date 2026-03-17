import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Switch",
    displayName: "Switch",
    description: "Routes input to one of multiple outputs based on a condition.",
    icon: "ListTree",
    accent: "group-routing",
    fields: [
        FieldBuilder.String({
            id: "condition",
            displayName: "Condition",
            initialValue: "",
            placeholder: "Expression to evaluate",
        }),
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "input",
            displayName: "Input",
            syncGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved({
            id: "true",
            displayName: "True",
            tooltip: "Output when condition is true.",
            syncGroupId: "data"
        }),
        OutputBuilder.Unresolved({
            id: "false",
            displayName: "False",
            tooltip: "Output when condition is false.",
            syncGroupId: "data"
        }),
    ],
});
