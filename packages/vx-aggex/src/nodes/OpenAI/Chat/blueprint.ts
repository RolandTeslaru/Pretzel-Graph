import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "OpenAI.Chat",
    displayName: "OpenAI Chat",
    description: "This node talks to OpenAI's GPT chat models via the Chat Completions API",
    icon: "OpenAI",
    accent: "port-LanguageModel",
    fields: [
        FieldBuilder.Secret({
            id: "api_key",
            displayName: "API Key",
        }),
        FieldBuilder.MultiOption({
            id: "model",
            displayName: "Model",
            options: [
                "gpt-5.2",
                "gpt-5.2-pro",
                "gpt-5",
                "gpt-5-mini",
                "gpt-5-nano",
                "gpt-4.5",
                "o3-mini",
                "o3",
            ],
            initialValue: "gpt-5.2",
        }),
        FieldBuilder.Float({
            id: "temperature",
            displayName: "Temperature",
            required: false,
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            slider: true,
            tooltip: "Controls randomness in the output. Higher values (e.g., 0.8) make output more random, lower values (e.g., 0.2) make it more focused and deterministic.",
        }),
        FieldBuilder.Integer({
            id: "maxTokens",
            displayName: "Max Tokens",
            required: false,
            initialValue: 2048,
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate in the chat completion.",
        }),
        FieldBuilder.Float({
            id: "topP",
            displayName: "Top P",
            required: false,
            initialValue: 1.0,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true,
            tooltip: "Nucleus sampling: considers the tokens with top_p probability mass. 0.1 means only tokens comprising the top 10% probability mass are considered.",
        }),
        FieldBuilder.Float({
            id: "frequencyPenalty",
            displayName: "Frequency Penalty",
            required: false,
            initialValue: 0,
            min: -2.0,
            max: 2.0,
            step: 0.1,
            tooltip: "Penalizes new tokens based on their existing frequency in the text so far. Positive values decrease the model's likelihood to repeat the same line verbatim.",
            advanced: true,
        }),
        FieldBuilder.Float({
            id: "presencePenalty",
            displayName: "Presence Penalty",
            required: false,
            initialValue: 0,
            min: -2.0,
            max: 2.0,
            step: 0.1,
            tooltip: "Penalizes new tokens based on whether they appear in the text so far. Positive values increase the model's likelihood to talk about new topics.",
            advanced: true,
        }),
    ],
    inputs: [
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
        }),
        InputBuilder.Message({
            id: "systemMessage",
            displayName: "System Message",
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The response message from the model",
        })
    ]
})

