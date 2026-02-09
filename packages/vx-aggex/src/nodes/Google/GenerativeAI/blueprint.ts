import { defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Google.GenerativeAI",
    icon: "Google",
    displayName: "Google Generative AI Node",
    description: "This node talks to google generative ai api",
    inputs: [
        InputBuilder.Secret({
            id: "api_key",
            displayName: "API Key",
            initialValue: "",
        }),
        InputBuilder.String({
            id: "prompt",
            displayName: "Prompt",
            required: true,
            initialValue: "",
            hasHandle: true,
        }),
        InputBuilder.MultiOption({
            id: "model",
            displayName: "Model",
            options: [
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-1.0-pro"
            ],
            initialValue: "gemini-1.5-flash",
        }),
        InputBuilder.Float({
            id: "temperature",
            displayName: "Temperature",
            required: false,
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            tooltip: "Controls randomness in the output. Higher values are more creative.",
            hasHandle: false,
        }),
        InputBuilder.Integer({
            id: "maxOutputTokens",
            displayName: "Max Output Tokens",
            required: false,
            initialValue: 2048,
            min: 1,
            step: 1,
            tooltip: "Maximum number of tokens to generate.",
            hasHandle: false,
        }),
        InputBuilder.Float({
            id: "topP",
            displayName: "Top P",
            required: false,
            initialValue: 0.95,
            min: 0,
            max: 1,
            step: 0.01,
            tooltip: "Nucleus sampling probability.",
            hasHandle: false,
        }),
        InputBuilder.Integer({
            id: "topK",
            displayName: "Top K",
            required: false,
            initialValue: 64,
            min: 1,
            step: 1,
            tooltip: "Top-K sampling parameter.",
            hasHandle: false,
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The response from the model",
        })
    ]
})