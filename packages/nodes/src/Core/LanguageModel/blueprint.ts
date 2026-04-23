import { defineBlueprint, InputBuilder, OutputBuilder, FieldBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.LanguageModel",
    displayName: "Language Model",
    description: "Runs a language model given a specified provider.",
    icon: "BrainCircuit",
    accent: "port-LanguageModel",
    fields: [
        FieldBuilder.Boolean({
            id: "stream",
            displayName: "Stream",
            initialValue: false,
            tooltip: "Whether to stream the response",
            advanced: true
        }),
    ],
    inputs: [
        InputBuilder.ToolList({
            id: "tools",
            displayName: "Tools",
        }),
        InputBuilder.LanguageModel({
            id: "languageModel",
            displayName: "Language Model",
            required: true
        }),
        InputBuilder.Message({
            id: "systemMessage",
            displayName: "System Message",
            tooltip: "A system message that helps set the behavior of the assistant"
        }),
        InputBuilder.MessageList({
            id: "messages",
            displayName: "Messages",
            required: true,
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The response from the model"
        })
    ]
});
