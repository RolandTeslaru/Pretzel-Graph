import { ConfigBuilder, defineBlueprint, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Text.Input",
    displayName: "Text Input",
    description: "This node is a Text input",
    icon: "Type",
    config: {
        text: ConfigBuilder.String({
            id: "text",
            displayName: "Text",
            initialValue: "",
        }),
    },
    inputs: [],
    outputs: [
        OutputBuilder.Message({
            id: "output",
            displayName: "Output",
            tooltip: "The output from the model",
        })
    ]
})

