"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Routing.Passthrough",
    displayName: "Passthrough",
    description: "Forwards each input directly to the output at the same index.",
    icon: "ArrowRightRight",
    accent: "group-routing",
    fields: [
        node_sdk_1.FieldBuilder.Variadic("ports", "Ports", {
            groupId: "passthrough"
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.Unresolved("input_0", "Input 0", {
            polymorphicGroupId: "passthrough_0",
            groupId: "passthrough"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Unresolved("output_0", "Output 0", {
            polymorphicGroupId: "passthrough_0",
            groupId: "passthrough"
        }),
    ],
});
