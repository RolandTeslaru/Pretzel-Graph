import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Output",
    displayName: "Chat Output",
    description: "This node is a chat output",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [
        FieldBuilder.Boolean({
            id: "write_to_session",
            displayName: "Write to Session",
            initialValue: true,
        })
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