import { defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Input",
    displayName: "Chat Input",
    description: "This node is a chat input",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [],
    inputs: [
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
            internal: true
        })
    ],
    outputs: [
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The response from the model",
        })
    ]
})