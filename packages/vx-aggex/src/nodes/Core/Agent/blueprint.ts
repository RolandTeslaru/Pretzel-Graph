import { defineBlueprint, InputBuilder, OutputBuilder, FieldBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Agent",
    displayName: "Agent",
    description: "Define the agent's instructions, then enter a task to complete using tools.",
    icon: "Bot",
    fields: [
        FieldBuilder.MultiOption({
            id: "agentLlm",
            displayName: "Model Provider",
            options: ["Google", "Connect other models"],
            initialValue: "Connect other models",
            tooltip: "The provider of the language model that the agent will use to generate responses."
        }),
        FieldBuilder.Secret({
            id: "apiKey",
            displayName: "API Key",
            initialValue: "",
            tooltip: "The API key to use for the model (if using a built-in provider)."
        }),
        FieldBuilder.String({
            id: "baseUrl",
            displayName: "Base URL",
            initialValue: "",
            tooltip: "The base URL of the API.",
            required: false // Python code says required=True but show=False usually implies optional override
        }),
        FieldBuilder.String({
            id: "projectId",
            displayName: "Project ID",
            initialValue: "",
            tooltip: "The project ID of the model.",
            required: false
        }),
        FieldBuilder.Integer({
            id: "maxOutputTokens",
            displayName: "Max Output Tokens",
            initialValue: 0, // Python code doesn't set default but type is Int
            tooltip: "The maximum number of tokens to generate.",
            required: false
        }),
        FieldBuilder.String({
            id: "systemPrompt",
            displayName: "Agent Instructions",
            multiline: true,
            initialValue: "You are a helpful assistant that can use tools to answer questions and perform tasks.",
            tooltip: "System Prompt: Initial instructions and context provided to guide the agent's behavior."
        }),
        FieldBuilder.String({
            id: "contextId",
            displayName: "Context ID",
            initialValue: "",
            tooltip: "The context ID of the chat. Adds an extra layer to the local memory.",
            advanced: true
        }),
        FieldBuilder.Integer({
            id: "nMessages",
            displayName: "Number of Chat History Messages",
            initialValue: 100,
            tooltip: "Number of chat history messages to retrieve.",
            advanced: true,
        }),
        FieldBuilder.String({
            id: "formatInstructions",
            displayName: "Output Format Instructions",
            multiline: true,
            initialValue: "You are an AI that extracts structured JSON objects from unstructured text. Use a predefined schema with expected types (str, int, float, bool, dict). Extract ALL relevant instances that match the schema - if multiple patterns exist, capture them all. Fill missing or ambiguous values with defaults: null for missing values. Remove exact duplicates but keep variations that have different field values. Always return valid JSON in the expected format, never throw errors. If multiple objects can be extracted, return them all in the structured format.",
            tooltip: "Generic Template for structured output formatting. Valid only with Structured response.",
            advanced: true
        }),
        FieldBuilder.Json({
            id: "outputSchema",
            displayName: "Output Schema",
            initialValue: [],
            tooltip: "Schema Validation: Define the structure and data types for structured output. No validation if no output schema.",
            advanced: true
        }),
        FieldBuilder.Boolean({
            id: "addCurrentDateTool",
            displayName: "Current Date",
            initialValue: true,
            tooltip: "If true, will add a tool to the agent that returns the current date.",
            advanced: true
        })
    ],
    inputs: [
        InputBuilder.Tool({
            id: "tools",
            displayName: "Tools",
            required: false,
            tooltip: "Tools the agent can use."
        }),
        InputBuilder.Message({
            id: "input",
            displayName: "Input",
            required: true,
            tooltip: "The user input message."
        }),
        InputBuilder.Message({
            id: "chatHistory",
            displayName: "Chat History",
            required: false,
            tooltip: "Previous conversation history."
        })
    ],
    outputs: [
        OutputBuilder.Message({
            id: "response",
            displayName: "Response",
            tooltip: "The agent's final response."
        })
    ]
});
