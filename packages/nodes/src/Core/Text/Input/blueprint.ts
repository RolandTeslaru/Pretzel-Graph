import { defineField, defineBlueprint, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Text.Input",
    displayName: "Text Input",
    description: "This node is a Text input",
    icon: "Type",
    accent: "port-Text",
    fields: [
        defineField.String("text", "Text", {
            required: true,
            multiline: true
        })
    ],
    inputs: [],
    outputs: [
        defineOutput.Message("output", "Output", {
            tooltip: "The output from the model"
        })
    ]
})

