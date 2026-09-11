import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Merge",
    displayName: "Merge",
    description: "Merges multiple inputs into a single output.",
    icon: "Merge",
    accent: "group-routing",
    fields: [
        defineField.Variadic("inputPorts", "Input Ports", {
            initialValue: 2,
            min: 1,
            max: 32,
            inputs: [
                defineInput.UnresolvedList("input_{n}", "Input {n}", {
                    polymorphicGroupId: "data",
                }),
            ],
        }),
        defineField.Integer("flattenDepth", "Flatten Depth", {
            initialValue: 1,
            min: 0,
            max: 10
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.UnresolvedList("output", "Output", {
            polymorphicGroupId: "data"
        }),
    ],
});
