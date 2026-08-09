import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.History",
    displayName: "Chat History",
    description: "Outputs the message history accumulated in the current chat session.",
    icon: "History",
    accent: "port-Message",
    fields: [
        FieldBuilder.String("chat_id", "Chat ID", {
            initialValue: "$igniter.chat_id",
            isExpressionInitially: true,
            tooltip: "The chat session to read and update."
        }),
    ],
    inputs: [
        InputBuilder.MessageList("overwrite", "Overwrite", {
            required: false
        }),
        InputBuilder.MessageList("append", "Append", {
            required: false
        }),
    ],
    outputs: [
        OutputBuilder.MessageList("history", "History", {
            tooltip: "The message history from the current chat session"
        }),
    ],
});
