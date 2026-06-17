import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Foundations } from "@pretzel-graph/shared/domain";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.IfElse",
    displayName: "If Else",
    description: "Routes input down one of two branches on a single true/false condition.",
    icon: "Split",
    accent: "group-routing",
    fields: [
        FieldBuilder.Condition({
            id: "condition",
            displayName: "Condition",
        }),
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "input",
            displayName: "Input",
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved({
            id: "true",
            displayName: "True",
            tooltip: "Output when condition is true.",
            polymorphicGroupId: "data"
        }),
        OutputBuilder.Unresolved({
            id: "false",
            displayName: "False",
            tooltip: "Output when condition is false.",
            polymorphicGroupId: "data"
        }),
    ],
});
