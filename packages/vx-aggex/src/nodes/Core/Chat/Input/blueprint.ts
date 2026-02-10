import { defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Input",
    displayName: "Chat Input",
    description: "This node is a chat input",
    icon: "MessagesSquare",
    inputs: [
        InputBuilder.String({
            id: "text",
            displayName: "Text",
            initialValue: "",
            hasHandle: true,
            advanced: false,
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