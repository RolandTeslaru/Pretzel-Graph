import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Memory",
    displayName: "Chat Memory",
    description: "Stores and retrieves conversation history for chat sessions",
    icon: "Memory",
    accent: "port-Message",
    fields: [
        FieldBuilder.Integer({
            id: "maxMessages",
            displayName: "Max Messages",
            required: false,
            initialValue: 50,
            min: 1,
            step: 1,
            tooltip: "Maximum number of messages to retain in memory.",
        }),
    ],
    inputs: [
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
            required: true,
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "messages",
            displayName: "Messages",
            tooltip: "The conversation history from memory",
        }),
    ],
});
