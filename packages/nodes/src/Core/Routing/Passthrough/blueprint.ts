import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Passthrough",
    displayName: "Passthrough",
    description: "Forwards each input directly to the output at the same index.",
    icon: "ArrowRightRight",
    accent: "group-routing",
    fields: [
        defineField.Variadic("ports", "Ports", {
            initialValue: 1,
            min: 1,
            max: 32,
            startIndex: 0,
            inputs: [
                defineInput.Unresolved("input_{n}", "Input {n}", {
                    polymorphicGroupId: "passthrough_{n}",
                }),
            ],
            outputs: [
                defineOutput.Unresolved("output_{n}", "Output {n}", {
                    polymorphicGroupId: "passthrough_{n}",
                }),
            ],
        }),
    ],
    inputs: [],
    outputs: [],
});
