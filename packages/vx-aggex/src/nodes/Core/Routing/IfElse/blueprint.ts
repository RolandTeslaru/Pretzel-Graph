import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.IfElse",
    displayName: "If Else",
    description: "Routes input to one of multiple outputs based on a condition.",
    icon: "Split",
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
        InputBuilder.Dynamic({
            id: "input",
            displayName: "Input",
            syncGroup: "data"
        }),
    ],
    outputs: [
        OutputBuilder.Dynamic({
            id: "true",
            displayName: "True",
            tooltip: "Output when condition is true.",
            syncGroup: "data"
        }),
        OutputBuilder.Dynamic({
            id: "false",
            displayName: "False",
            tooltip: "Output when condition is false.",
            syncGroup: "data"
        }),
    ],
});
