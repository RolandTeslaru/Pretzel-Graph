import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Merge",
    displayName: "Merge",
    description: "Merges multiple inputs into a single output.",
    icon: "Merge",
    accent: "group-routing",
    fields: [
        FieldBuilder.MultiOption({
            id: "strategy",
            displayName: "Strategy",
            options: ["AND", "OR", "XOR"],
            initialValue: "AND",
            variant: "tab",
        }),
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
            syncGroupId: "data"
        }),
        InputBuilder.UnresolvedList({
            id: "input_2",
            displayName: "Input 2",
            syncGroupId: "data"
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedList({
            id: "output",
            displayName: "Output",
            syncGroupId: "data"
        }),
    ],
});
