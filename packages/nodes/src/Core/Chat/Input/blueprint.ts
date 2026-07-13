import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Input",
    displayName: "Chat Input",
    description: "This node is a chat input",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [
        FieldBuilder.String({
            id: "chat_id",
            displayName: "Chat ID",
            initialValue: "$igniter.chat_id",
            isExpression: true,
            tooltip: "The chat session to receive and store this message in.",
        }),
        FieldBuilder.Boolean({
            id: "write_to_session",
            displayName: "Write to Session",
            initialValue: true,
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The response from the model",
        })
    ]
})
