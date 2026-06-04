import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.Input",
    displayName: "Chat Input",
    description: "This node is a chat input",
    icon: "MessagesSquare",
    accent: "port-Message",
    fields: [
        FieldBuilder.Boolean({
            id: "write_to_session",
            displayName: "Write to Session",
            initialValue: true,
        })
    ],
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