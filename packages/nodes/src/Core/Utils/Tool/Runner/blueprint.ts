import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Runner",
    displayName: "Tool Runner",
    description: "Executes a tool with the provided input and returns the result.",
    icon: "Play",
    accent: "port-Tool",
    fields: [],
    inputs: [
        InputBuilder.ToolList({
            id: "tools",
            displayName: "Tools",
            required: true
        }),
        InputBuilder.Message({
            id: "input",
            displayName: "AIMessage Input",
            required: true,
        }),
    ],
    outputs: [
        OutputBuilder.MessageList({
            id: "toolOutputs",
            displayName: "Messages",
            tooltip: "The received AIMessage followed by each tool result, ready to append to the conversation history.",
        }),
    ],
});


