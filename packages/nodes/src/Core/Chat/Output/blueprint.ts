import { defineBlueprint, FieldBuilder, InputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Output",
    displayName: "Chat Output",
    description: "This node is a chat output",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [
        FieldBuilder.String({
            id: "chat_id",
            displayName: "Chat ID",
            initialValue: "$igniter.chat_id",
            isExpression: true,
            tooltip: "The chat session to publish and store these messages in.",
        }),
        FieldBuilder.Boolean({
            id: "write_to_session",
            displayName: "Write to Session",
            initialValue: true,
        }),
    ],
    inputs: [
        InputBuilder.MessageList({
            id: "messages",
            displayName: "Messages",
            required: true
        })
    ],
    outputs: []
})
