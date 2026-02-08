import { defineNode, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Definition = defineNode({
    id: "OpenAI.Chat.v1",
    displayName: "OpenAI Chat",
    description: "This node talks to OpenAI's GPT chat models via the Chat Completions API",
    icon: "OpenAI",
    drawerId: "openai",
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
                "gpt-4.1",
                "gpt-4.1-mini",
                "gpt-4.1-nano",
                "gpt-4o",
                "gpt-4o-mini",
                "gpt-4-turbo",
                "gpt-4",
                "gpt-3.5-turbo"
            ],
            initialValue: "gpt-4.1",
        }),
        InputBuilder.Float({
            id: "temperature",
            displayName: "Temperature",
            required: false,
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            tooltip: "Controls randomness in the output. Higher values (e.g., 0.8) make output more random, lower values (e.g., 0.2) make it more focused and deterministic.",
            hasHandle: false,
        }),
        InputBuilder.Integer({
            id: "maxTokens",
            displayName: "Max Tokens",
            required: false,
            initialValue: 2048,
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate in the chat completion.",
            hasHandle: false,
        }),
        InputBuilder.Float({
            id: "topP",
            displayName: "Top P",
            required: false,
            initialValue: 1.0,
            min: 0,
            max: 1,
            step: 0.01,
            tooltip: "Nucleus sampling: considers the tokens with top_p probability mass. 0.1 means only tokens comprising the top 10% probability mass are considered.",
            hasHandle: false,
        }),
        InputBuilder.Float({
            id: "frequencyPenalty",
            displayName: "Frequency Penalty",
            required: false,
            initialValue: 0,
            min: -2.0,
            max: 2.0,
            step: 0.1,
            tooltip: "Penalizes new tokens based on their existing frequency in the text so far. Positive values decrease the model's likelihood to repeat the same line verbatim.",
            hasHandle: false,
        }),
        InputBuilder.Float({
            id: "presencePenalty",
            displayName: "Presence Penalty",
            required: false,
            initialValue: 0,
            min: -2.0,
            max: 2.0,
            step: 0.1,
            tooltip: "Penalizes new tokens based on whether they appear in the text so far. Positive values increase the model's likelihood to talk about new topics.",
            hasHandle: false,
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

