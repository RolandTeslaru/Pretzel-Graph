import { defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Output",
    displayName: "Chat Output",
    description: "This node is a chat output",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [],
    inputs: [
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
            required: true
        })
    ],
    outputs: []
})