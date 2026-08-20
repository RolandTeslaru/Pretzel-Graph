"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Routing.CatchError",
    displayName: "Catch Error",
    description: "Catches a propagating error. Non-error data passes straight through; an incoming error is serialized to the 'On Error' output and propagation stops here.",
    icon: "ShieldAlert",
    accent: "group-routing",
    iconColor: "destructive",
    fields: [],
    inputs: [
        node_sdk_1.InputBuilder.Unresolved("input", "Input", {
            polymorphicGroupId: "catch_passthrough"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Unresolved("passthrough", "Passthrough", {
            polymorphicGroupId: "catch_passthrough"
        }),
        node_sdk_1.OutputBuilder.Data("onError", "On Error", {
            tooltip: "The serialized error (code + message) when a propagating error is caught here."
        }),
    ],
});
