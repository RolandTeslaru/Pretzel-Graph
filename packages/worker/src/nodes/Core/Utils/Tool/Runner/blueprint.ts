import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.Runner",
    displayName: "Tool Runner",
    description: "Executes a tool with the provided input and returns the result.",
    icon: "Play",
    accent: "port-Tool",
    fields: [],
    inputs: [
        InputBuilder.Tool({
            id: "tool",
            displayName: "Tool",
        }),
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "output",
            displayName: "Output",
            tooltip: "The result of the tool execution.",
        }),
    ],
});
