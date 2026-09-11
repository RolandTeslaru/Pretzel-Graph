import { defineBlueprint, defineField, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Input",
    displayName: "Chat Input",
    description: "This node is a chat input",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [
        defineField.String("chat_id", "Chat ID", {
            initialValue: "$igniter.chat_id",
            isExpressionInitially: true,
            tooltip: "The chat session to receive and store this message in."
        }),
        defineField.Boolean("write_to_session", "Write to Session", {
            initialValue: true
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.Message("response", "Response", {
            tooltip: "The response from the model"
        })
    ]
})
