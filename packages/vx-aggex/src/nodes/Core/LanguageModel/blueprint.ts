import { defineBlueprint, InputBuilder, OutputBuilder, FieldBuilder } from "src/nodes/builders";

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
        InputBuilder.LanguageModel({
            id: "languageModel",
            displayName: "Language Model",
        }),
        InputBuilder.MessageList({
            id: "chatHistory",
            displayName: "Chat History",
            required: false,
            tooltip: "Chat history to be included in the context window"
        }),
        InputBuilder.HumanMessage({
            id: "input",
            displayName: "Input",
            required: true,
            tooltip: "The input text to send to the model"
        }),
        InputBuilder.SystemMessage({
            id: "systemMessage",
            displayName: "System Message",
            tooltip: "A system message that helps set the behavior of the assistant"
        })
    ],
    outputs: [
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The response from the model"
        })
    ]
});
