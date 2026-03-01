import { defineBlueprint, InputBuilder, OutputBuilder, FieldBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.LanguageModel",
    displayName: "Language Model",
    description: "Runs a language model given a specified provider.",
    icon: "BrainCircuit",
    accent: "port-LanguageModel",
    fields: [
        FieldBuilder.MultiOption({
            id: "provider",
            displayName: "Model Provider",
            reconcile: true,
            options: ["OpenAI", "Anthropic", "Google"],
            initialValue: "OpenAI",
            tooltip: "Select the model provider",
            variant: "select"
        }),
        FieldBuilder.MultiOption({
            id: "model",
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
        }),
        FieldBuilder.Integer({
            id: "maxOutputTokens",
            displayName: "Max Output Tokens",
            required: false,
            initialValue: 2048,
            min: 1,
            step: 1,
            tooltip: "Maximum number of tokens to generate.",
            advanced: true
        }),
        FieldBuilder.Float({
            id: "topP",
            displayName: "Top P",
            required: false,
            initialValue: 0.95,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true,
            tooltip: "Nucleus sampling probability.",
            advanced: true
        }),
        FieldBuilder.Integer({
            id: "topK",
            displayName: "Top K",
            required: false,
            initialValue: 64,
            min: 1,
            step: 1,
            slider: true,
            tooltip: "Top-K sampling parameter.",
            advanced: true
        })
    ],
    inputs: [
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
            required: true,
            tooltip: "The input text to send to the model"
        }),
        InputBuilder.Message({
            id: "systemMessage",
            displayName: "System Message",
            tooltip: "A system message that helps set the behavior of the assistant"
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
