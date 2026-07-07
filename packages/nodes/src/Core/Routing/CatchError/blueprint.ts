import { defineBlueprint, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.CatchError",
    displayName: "Catch Error",
    description: "Catches a propagating error. Non-error data passes straight through; an incoming error is serialized to the 'On Error' output and propagation stops here.",
    icon: "ShieldAlert",
    accent: "group-routing",
    iconColor: "destructive",
    fields: [],
    inputs: [
        InputBuilder.Unresolved({
            id: "input",
            displayName: "Input",
            polymorphicGroupId: "catch_passthrough",
        }),
    ],
    outputs: [
        OutputBuilder.Unresolved({
            id: "passthrough",
            displayName: "Passthrough",
        polymorphicGroupId: "catch_passthrough",
        }),
        OutputBuilder.Data({
            id: "onError",
            displayName: "On Error",
            tooltip: "The serialized error (code + message) when a propagating error is caught here.",
        }),
    ],
});
