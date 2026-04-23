import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@vx-agent-editor/node-sdk";

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
        InputBuilder.Unresolved({
            id: "input_1",
            displayName: "Input 1",
            polymorphicGroupId: "passthrough_1",
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
        OutputBuilder.Unresolved({
            id: "output_1",
            displayName: "Output 1",
            polymorphicGroupId: "passthrough_1",
            groupId: "passthrough",
        }),
    ],
});
