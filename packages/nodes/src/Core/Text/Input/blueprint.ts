import { FieldBuilder, defineBlueprint, OutputBuilder, InputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Text.Input",
    displayName: "Text Input",
    description: "This node is a Text input",
    icon: "Type",
    accent: "port-Text",
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

