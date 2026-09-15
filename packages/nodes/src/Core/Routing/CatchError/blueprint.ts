import { defineBlueprint, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.CatchError",
    displayName: "Catch Error",
    description: "Catches a propagating error. Non-error data passes straight through; an incoming error is serialized to the 'On Error' output and propagation stops here.",
    icon: "ShieldAlert",
    accent: "group-routing",
    iconColor: "destructive",
    fields: [],
    inputs: [
        defineInput.Unresolved("input", "Input", {
            polymorphicGroupId: "catch_passthrough"
        }),
    ],
    outputs: [
        defineOutput.Unresolved("passthrough", "Passthrough", {
            polymorphicGroupId: "catch_passthrough"
        }),
        defineOutput.Data("onError", "On Error", {
            tooltip: "The serialized error (code + message) when a propagating error is caught here."
        }),
    ],
});
