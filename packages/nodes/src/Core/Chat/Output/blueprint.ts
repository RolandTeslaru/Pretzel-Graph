import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Output",
    displayName: "Chat Output",
    description: "This node is a chat output",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [],
    inputs: [
        InputBuilder.MessageList({
            id: "messages",
            displayName: "Messages",
            required: true
        })
    ],
    outputs: []
})