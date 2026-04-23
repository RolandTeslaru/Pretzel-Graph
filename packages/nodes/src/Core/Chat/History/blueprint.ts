import { defineBlueprint, InputBuilder, OutputBuilder } from "@vx-agent-editor/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.SessionMessages",
    displayName: "Session Messages",
    description: "Outputs the message history accumulated in the current execution session",
    icon: "History",
    accent: "port-Message",
    fields: [],
    inputs: [
        InputBuilder.MessageList({
            id: "overwrite",
            displayName: "Overwrite",
            required: false,
        }),
        InputBuilder.MessageList({
            id: "append",
            displayName: "Append",
            required: false,
        }),
    ],
    outputs: [
        OutputBuilder.MessageList({
            id: "history",
            displayName: "History",
            tooltip: "The message history from the current execution session",
        }),
    ],
});
