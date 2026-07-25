import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Merge",
    displayName: "Merge",
    description: "Merges multiple inputs into a single output.",
    icon: "Merge",
    accent: "group-routing",
    fields: [
        FieldBuilder.Variadic("inputPorts", "Input Ports", {
            groupId: "variadic_inputs_1"
        }),
        FieldBuilder.Integer("flattenDepth", "Flatten Depth", {
            initialValue: 1,
            min: 0,
            max: 10
        }),
    ],
    inputs: [
        InputBuilder.UnresolvedList("input_1", "Input 1", {
            polymorphicGroupId: "data",
            groupId: "variadic_inputs_1"
        }),
        InputBuilder.UnresolvedList("input_2", "Input 2", {
            polymorphicGroupId: "data",
            groupId: "variadic_inputs_1"
        }),
    ],
    outputs: [
        OutputBuilder.UnresolvedList("output", "Output", {
            polymorphicGroupId: "data"
        }),
    ],
});
