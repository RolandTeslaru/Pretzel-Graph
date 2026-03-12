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
    ],
    inputs: [
        InputBuilder.Dynamic({
            id: "input_1",
            displayName: "Input 1",
            syncGroup: "data"
        }),
        InputBuilder.Dynamic({
            id: "input_2",
            displayName: "Input 2",
            syncGroup: "data"
        }),
    ],
    outputs: [
        OutputBuilder.Dynamic({
            id: "output",
            displayName: "Output",
            syncGroup: "data"
        }),
    ],
});
