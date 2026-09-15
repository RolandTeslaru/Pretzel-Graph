import { defineBlueprint, defineInput, defineOutput, defineField } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.LanguageModel",
    displayName: "Language Model",
    description: "Sends a message history to the connected model and returns its reply.",
    icon: "BrainCircuit",
    accent: "port-LanguageModel",
    fields: [
        // Streaming is not surfaced yet — the node consumes the provider stream
        // internally and emits one complete message, so this field would do nothing.
        // defineField.Boolean("stream", "Stream", {
        //     initialValue: false,
        //     tooltip: "Emit tokens as they arrive instead of one complete message.",
        //     advanced: true
        // }),
        defineField.String("systemMessage", "System Message", {
            initialValue: "",
            tooltip: "Instructions prepended to every run to steer how the model responds."
        })
    ],
    inputs: [
        defineInput.ToolList("tools", "Tools", {}),
        defineInput.LanguageModel("languageModel", "Language Model", {
            required: true
        }),
        defineInput.MessageList("messages", "Messages", {
            required: true
        }),
    ],
    outputs: [
        defineOutput.Message("response", "Response", {
            tooltip: "The response from the model"
        })
    ]
});
