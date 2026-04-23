import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "@vx-agent-editor/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.OpenAI.Chat",
    displayName: "OpenAI Chat",
    description: "This node talks to OpenAI's GPT chat models via the Chat Completions API",
    icon: "OpenAI",
    accent: "port-LanguageModel",
    fields: [
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "API Key",
        }),
        FieldBuilder.MultiOption({
            id: "model",
            displayName: "Model",
            options: [
                { value: "gpt-5.2", displayName: "GPT-5.2" },
                { value: "gpt-5.2-pro", displayName: "GPT-5.2 Pro" },
                { value: "gpt-5", displayName: "GPT-5" },
                { value: "gpt-5-mini", displayName: "GPT-5 Mini" },
                { value: "gpt-5-nano", displayName: "GPT-5 Nano" },
                { value: "gpt-4.5", displayName: "GPT-4.5" },
                { value: "o3-mini", displayName: "o3-mini" },
                { value: "o3", displayName: "o3" },
            ],
            initialValue: "gpt-5.2",
        }),
        FieldBuilder.Float({
            id: "temperature",
            displayName: "Temperature",
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
            initialValue: 2048,
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate in the chat completion.",
        }),
        FieldBuilder.Float({
            id: "topP",
            displayName: "Top P",
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
            initialValue: 0,
            min: -2.0,
            max: 2.0,
            step: 0.1,
            tooltip: "Penalizes new tokens based on whether they appear in the text so far. Positive values increase the model's likelihood to talk about new topics.",
            advanced: true,
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.LanguageModel({
            id: "languageModel",
            displayName: "Language Model",
            tooltip: "The language model instance used for this response, useful for chaining calls with the same model and settings.",
        })
    ]
})
