import { FieldBuilder, defineBlueprint, OutputBuilder, InputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Text.Input",
    displayName: "Text Input",
    description: "This node is a Text input",
    icon: "Type",
    accent: "port-Text",
    fields: [],
    inputs: [
        InputBuilder.Text("text", "Text", {
            required: true
        })
    ],
    outputs: [
        OutputBuilder.Message("output", "Output", {
            tooltip: "The output from the model"
        })
    ]
})

