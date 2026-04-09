import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Merge",
    displayName: "Merge",
    description: "Merges multiple inputs into a single output.",
    icon: "Merge",
    accent: "group-routing",
    fields: [
        FieldBuilder.List({
            id: "ordering",
            displayName: "Input Ordering",
            initialValue: ["input_1", "input_2"],
        }),
    ],
    inputs: [
        InputBuilder.UnresolvedList({
            id: "input_1",
            displayName: "Input 1",
            polymorphicGroupId: "data"
        }),
        InputBuilder.UnresolvedList({
            id: "input_2",
            displayName: "Input 2",
            polymorphicGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedList({
            id: "output",
            displayName: "Output",
            polymorphicGroupId: "data"
        }),
    ],
});
