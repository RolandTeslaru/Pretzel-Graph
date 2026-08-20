"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Utils.Tool.Catalog",
    displayName: "Tool Catalog",
    description: "Utility node for managing a catalog of tools.",
    icon: "SwatchBook",
    accent: "port-Tool",
    fields: [
        node_sdk_1.FieldBuilder.Variadic("tools_num", "Tools", {
            groupId: "tools_group"
        })
    ],
    inputs: [
        node_sdk_1.InputBuilder.ToolList("tool_1", "Tool 1", {
            groupId: "tools_group"
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.ToolList("tool_list", "Tool List", {})
    ],
});
