import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Runner",
    displayName: "Tool Runner",
    description: "Executes a tool with the provided input and returns the result.",
    icon: "Play",
    accent: "port-Tool",
    fields: [],
    inputs: [
        defineInput.ToolList("tools", "Tools", {
            required: true
        }),
        defineInput.ToolList("deniedTools", "Denied", {
            tooltip: "Calls to these tools are not run. The model is told the call was denied and can carry on without it."
        }),
        defineInput.Message("input", "AIMessage Input", {
            required: true
        }),
    ],
    outputs: [
        defineOutput.MessageList("toolOutputs", "Messages", {
            tooltip: "The received AIMessage followed by each tool result, ready to append to the conversation history."
        }),
    ],
});


