import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@vx-agent-editor/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Merge",
    displayName: "Merge",
    description: "Merges multiple inputs into a single output.",
    icon: "Merge",
    accent: "group-routing",
    fields: [
        FieldBuilder.Variadic({
            id: "inputPorts",
            displayName: "Input Ports",
            groupId: "variadic_inputs_1",
        }),
    ],
    inputs: [
        InputBuilder.UnresolvedList({
            id: "input_1",
            displayName: "Input 1",
            polymorphicGroupId: "data",
            groupId: "variadic_inputs_1",
        }),
        InputBuilder.UnresolvedList({
            id: "input_2",
            displayName: "Input 2",
            polymorphicGroupId: "data",
            groupId: "variadic_inputs_1",
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
