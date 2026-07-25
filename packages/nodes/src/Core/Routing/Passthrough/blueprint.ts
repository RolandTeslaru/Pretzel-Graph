import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Passthrough",
    displayName: "Passthrough",
    description: "Forwards each input directly to the output at the same index.",
    icon: "ArrowRightRight",
    accent: "group-routing",
    fields: [
        FieldBuilder.Variadic("ports", "Ports", {
            groupId: "passthrough"
        }),
    ],
    inputs: [
        InputBuilder.Unresolved("input_0", "Input 0", {
            polymorphicGroupId: "passthrough_0",
            groupId: "passthrough"
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved("output_0", "Output 0", {
            polymorphicGroupId: "passthrough_0",
            groupId: "passthrough"
        }),
    ],
});
