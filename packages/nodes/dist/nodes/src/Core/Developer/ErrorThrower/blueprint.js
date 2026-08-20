"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Developer.ErrorThrower",
    displayName: "Error Thrower",
    description: "Throws a configured error when the node is executed.",
    icon: "Bug",
    accent: "utility",
    fields: [
        node_sdk_1.FieldBuilder.String("error", "Error", {
            initialValue: "Intentional error",
            multiline: true,
            placeholder: "Enter the error message to throw"
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.Unresolved("trigger", "Trigger", {
            required: false,
            tooltip: "Optional trigger to execute this node and throw an error.",
            polymorphicGroupId: "signal"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Unresolved("result", "Result", {
            polymorphicGroupId: "signal",
            tooltip: "Never produced — the node always throws. Wire it to a Catch node to test error propagation."
        }),
    ],
});
