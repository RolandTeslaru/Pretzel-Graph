import { defineNode, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Definition = defineNode({
    id: "Core.Text.Input",
    displayName: "Text Input",
    description: "This node is a Text input",
    icon: "type",
    drawerId: "input_output",
    inputs: [
        InputBuilder.String({
            id: "text",
            displayName: "Text",
            required: true,
            initialValue: "",
            hasHandle: true,
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "output",
            displayName: "Output",
            tooltip: "The output from the model",
        })
    ]
})

