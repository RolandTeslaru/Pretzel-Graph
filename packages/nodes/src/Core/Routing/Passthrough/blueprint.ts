import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Passthrough",
    displayName: "Passthrough",
    description: "Forwards each input directly to the output at the same index.",
    icon: "ArrowRightRight",
    accent: "group-routing",
    fields: [
        FieldBuilder.Variadic({
            id: "ports",
            displayName: "Ports",
            groupId: "passthrough",
        }),
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "input_0",
            displayName: "Input 0",
            polymorphicGroupId: "passthrough_0",
            groupId: "passthrough",
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved({
            id: "output_0",
            displayName: "Output 0",
            polymorphicGroupId: "passthrough_0",
            groupId: "passthrough",
        }),
    ],
});
