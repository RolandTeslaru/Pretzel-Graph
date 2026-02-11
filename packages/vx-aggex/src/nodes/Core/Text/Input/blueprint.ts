import { defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Text.Input",
    displayName: "Text Input",
    description: "This node is a Text input",
    icon: "Type",
    inputs: [
        InputBuilder.String({
            id: "text",
            displayName: "Text",
            required: true,
            initialValue: "",
            advanced: false,
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

