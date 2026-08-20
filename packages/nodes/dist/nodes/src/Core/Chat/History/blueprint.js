"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Chat.History",
    displayName: "Chat History",
    description: "Outputs the message history accumulated in the current chat session.",
    icon: "History",
    accent: "port-Message",
    fields: [
        node_sdk_1.FieldBuilder.String("chat_id", "Chat ID", {
            initialValue: "$igniter.chat_id",
            isExpressionInitially: true,
            tooltip: "The chat session to read and update."
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.MessageList("overwrite", "Overwrite", {
            required: false
        }),
        node_sdk_1.InputBuilder.MessageList("append", "Append", {
            required: false
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.MessageList("history", "History", {
            tooltip: "The message history from the current chat session"
        }),
    ],
});
