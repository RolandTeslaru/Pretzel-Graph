import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Router",
    displayName: "Router",
    description: "Routes input to multiple outputs simultaneously based on independent conditions.",
    icon: "ListTree",
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
