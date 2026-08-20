"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Routing.Merge",
    displayName: "Merge",
    description: "Merges multiple inputs into a single output.",
    icon: "Merge",
    accent: "group-routing",
    fields: [
        node_sdk_1.FieldBuilder.Variadic("inputPorts", "Input Ports", {
            groupId: "variadic_inputs_1"
        }),
        node_sdk_1.FieldBuilder.Integer("flattenDepth", "Flatten Depth", {
            initialValue: 1,
            min: 0,
            max: 10
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.UnresolvedList("input_1", "Input 1", {
            polymorphicGroupId: "data",
            groupId: "variadic_inputs_1"
        }),
        node_sdk_1.InputBuilder.UnresolvedList("input_2", "Input 2", {
            polymorphicGroupId: "data",
            groupId: "variadic_inputs_1"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.UnresolvedList("output", "Output", {
            polymorphicGroupId: "data"
        }),
    ],
});
