"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Chat.Input",
    displayName: "Chat Input",
    description: "This node is a chat input",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [
        node_sdk_1.FieldBuilder.String("chat_id", "Chat ID", {
            initialValue: "$igniter.chat_id",
            isExpressionInitially: true,
            tooltip: "The chat session to receive and store this message in."
        }),
        node_sdk_1.FieldBuilder.Boolean("write_to_session", "Write to Session", {
            initialValue: true
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Message("response", "Response", {
            tooltip: "The response from the model"
        })
    ]
});
