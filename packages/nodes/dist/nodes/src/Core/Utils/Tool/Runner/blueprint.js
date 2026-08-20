"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Utils.Tool.Runner",
    displayName: "Tool Runner",
    description: "Executes a tool with the provided input and returns the result.",
    icon: "Play",
    accent: "port-Tool",
    fields: [],
    inputs: [
        node_sdk_1.InputBuilder.ToolList("tools", "Tools", {
            required: true
        }),
        node_sdk_1.InputBuilder.Message("input", "AIMessage Input", {
            required: true
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.MessageList("toolOutputs", "Messages", {
            tooltip: "The received AIMessage followed by each tool result, ready to append to the conversation history."
        }),
    ],
});
