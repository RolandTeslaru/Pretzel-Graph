import { defineBlueprint, InputBuilder, OutputBuilder, FieldBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.LanguageModel",
    displayName: "Language Model",
    description: "Runs a language model given a specified provider.",
    icon: "BrainCircuit",
    accent: "port-LanguageModel",
    fields: [
        FieldBuilder.Boolean("stream", "Stream", {
            initialValue: false,
            tooltip: "Whether to stream the response",
            advanced: true
        }),
        FieldBuilder.String("systemMessage", "System Message", {
            initialValue: "",
            tooltip: "A system message that helps set the behavior of the assistant"
        })
    ],
    inputs: [
        InputBuilder.ToolList("tools", "Tools", {}),
        InputBuilder.LanguageModel("languageModel", "Language Model", {
            required: true
        }),
        InputBuilder.MessageList("messages", "Messages", {
            required: true
        }),
    ],
    outputs: [
        OutputBuilder.Message("response", "Response", {
            tooltip: "The response from the model"
        })
    ]
});
