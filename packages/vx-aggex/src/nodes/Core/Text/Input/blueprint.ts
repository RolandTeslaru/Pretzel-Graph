import { FieldBuilder, defineBlueprint, OutputBuilder, InputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Text.Input",
    displayName: "Text Input",
    description: "This node is a Text input",
    icon: "Type",
    fields: [],
    inputs: [
        InputBuilder.Text({
            id: "text",
            displayName: "Text",
            required: true
        })
    ],
    outputs: [
        OutputBuilder.Message({
            id: "output",
            displayName: "Output",
            tooltip: "The output from the model",
        })
    ]
})

