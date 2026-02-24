import { defineBlueprint, InputBuilder, OutputBuilder, FieldBuilder } from "../../builders";

export const Blueprint = defineBlueprint({
    id: "Core.Agent",
    displayName: "Agent",
    description: "Define the agent's instructions, then enter a task to complete using tools.",
    icon: "Bot",
    accent: "port-LanguageModel",
    fields: [
        FieldBuilder.MultiOption({
            id: "provider",
            displayName: "Model Provider",
            reconcile: true,
            options: ["Google", "OpenAI", "Anthropic", "Connect other models"],
            initialValue: "Google",
            tooltip: "The provider of the language model that the agent will use to generate responses."
        }),
        FieldBuilder.MultiOption({
            id: "model",
            displayName: "Model",
            options: [
                "gemini-3-pro-preview",
                "gemini-2.5-pro",
                "gemini-3-flash-preview",
                "gemini-2.5-flash",
                "gemini-2.5-flash-lite",
            ],
            initialValue: "gemini-3-pro-preview",
        }),
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "Google Generative API Key",
            initialValue: "",
            required: true,
            tooltip: "The API key to use for the model (if using a built-in provider)."
        }),
        FieldBuilder.Integer({
            id: "maxOutputTokens",
            displayName: "Max Output Tokens",
            initialValue: 0, // Python code doesn't set default but type is Int
            tooltip: "The maximum number of tokens to generate.",
            required: false
        }),
    ],
    inputs: [
        InputBuilder.Message({
            id: "systemPrompt",
            displayName: "Agent Instructions",
            initialValue: "You are a helpful assistant that can use tools to answer questions and perform tasks.",
            tooltip: "System Prompt: Initial instructions and context provided to guide the agent's behavior."
        }),
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
            required: true,
            tooltip: "The user input message."
        }),
        InputBuilder.Tool({
            id: "tools",
            displayName: "Tools",
            required: false,
            tooltip: "Tools the agent can use."
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The agent's final response."
        })
    ]
});
