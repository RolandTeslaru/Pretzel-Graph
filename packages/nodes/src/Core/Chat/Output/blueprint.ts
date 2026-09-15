import { defineBlueprint, defineField, defineInput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Output",
    displayName: "Chat Output",
    description: "This node is a chat output",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [
        defineField.String("chat_id", "Chat ID", {
            initialValue: "$igniter.chat_id",
            isExpressionInitially: true,
            tooltip: "The chat session to publish and store these messages in."
        }),
        defineField.Boolean("write_to_session", "Write to Session", {
            initialValue: true
        }),
    ],
    inputs: [
        defineInput.MessageList("messages", "Messages", {
            required: true
        })
    ],
    outputs: []
})
