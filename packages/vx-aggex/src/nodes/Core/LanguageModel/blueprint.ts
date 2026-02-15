import { defineBlueprint, InputBuilder, OutputBuilder, FieldBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.LanguageModel",
    displayName: "Language Model",
    description: "Runs a language model given a specified provider.",
    icon: "BrainCircuit",
    fields: [
        FieldBuilder.MultiOption({
            id: "provider",
            displayName: "Model Provider",
            options: ["OpenAI", "Anthropic", "Google", "IBM watsonx.ai", "Ollama"],
            initialValue: "OpenAI",
            tooltip: "Select the model provider",
            variant: "select"
        }),
        FieldBuilder.MultiOption({
            id: "modelName",
            displayName: "Model Name",
            options: [
                "gpt-4.5-preview",
                "gpt-4o",
                "gpt-4o-mini",
                "o1",
                "o1-mini",
                "o3-mini",
                "gpt-4-turbo",
                "gpt-3.5-turbo"
            ],
            initialValue: "gpt-4o",
            tooltip: "Select the model to use",
            variant: "select"
        }),
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "OpenAI API Key",
            initialValue: "",
            tooltip: "Model Provider API key"
        }),
        FieldBuilder.String({
            id: "systemMessage",
            displayName: "System Message",
            multiline: true,
            initialValue: "",
            tooltip: "A system message that helps set the behavior of the assistant"
        }),
        FieldBuilder.Boolean({
            id: "stream",
            displayName: "Stream",
            initialValue: false,
            tooltip: "Whether to stream the response",
            advanced: true
        }),
        FieldBuilder.Float({
            id: "temperature",
            displayName: "Temperature",
            initialValue: 0.1,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true,
            tooltip: "Controls randomness in responses",
            advanced: true
        })
    ],
    inputs: [
        InputBuilder.Message({
            id: "inputValue",
            displayName: "Input",
            required: true,
            tooltip: "The input text to send to the model"
        })
    ],
    outputs: [
        OutputBuilder.LanguageModel({
            id: "languageModel",
            displayName: "Language Model",
            tooltip: "The configured language model instance"
        }),
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The response from the model"
        })
    ]
});
