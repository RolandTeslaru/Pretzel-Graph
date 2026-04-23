import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@vx-agent-editor/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Runner",
    displayName: "Tool Runner",
    description: "Executes a tool with the provided input and returns the result.",
    icon: "Hammer",
    accent: "port-Tool",
    fields: [],
    inputs: [
        InputBuilder.ToolList({
            id: "tools",
            displayName: "Tools",
        }),
        InputBuilder.Message({
            id: "input",
            displayName: "AIMessage Input",
        }),
    ],
    outputs: [
        OutputBuilder.MessageList({
            id: "toolOutputs",
            displayName: "Tool Outputs",
            tooltip: "The result of the tool execution.",
        }),
    ],
});


