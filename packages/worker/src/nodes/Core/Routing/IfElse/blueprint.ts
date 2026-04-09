import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";
import { Foundations } from "@vx-agent-editor/shared/domain";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.IfElse",
    displayName: "If Else",
    description: "Routes input to one of multiple outputs based on a condition.",
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
