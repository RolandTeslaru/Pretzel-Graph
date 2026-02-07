import { Foundations } from "@vx-agent-editor/shared/types";
import { InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Definition = {
    id: "Google.GenerativeAI.v1" as Foundations.NodeDefinition.Id,
    displayName: "Google Generative AI Node",
    description: "This node talks to google generative ai api",
    inputs: {
        api_key: InputBuilder.Secret({
            displayName: "API Key",
            initialValue: "",
        }),
        prompt: InputBuilder.String({
            displayName: "Prompt",
            required: true,
            initialValue: "",
            hasHandle: true,
        }),
        model: InputBuilder.MultiOption({
            displayName: "Model",
            options: [
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-1.0-pro"
            ],
            initialValue: "gemini-1.5-flash",
        }),
        temperature: InputBuilder.Float({
            displayName: "Temperature",
            required: false,
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            tooltip: "Controls randomness in the output. Higher values are more creative.",
            hasHandle: false,
        }),
        maxOutputTokens: InputBuilder.Integer({
            displayName: "Max Output Tokens",
            required: false,
            initialValue: 2048,
            min: 1,
            step: 1,
            tooltip: "Maximum number of tokens to generate.",
            hasHandle: false,
        }),
        topP: InputBuilder.Float({
            displayName: "Top P",
            required: false,
            initialValue: 0.95,
            min: 0,
            max: 1,
            step: 0.01,
            tooltip: "Nucleus sampling probability.",
            hasHandle: false,
        }),
        topK: InputBuilder.Integer({
            displayName: "Top K",
            required: false,
            initialValue: 64,
            min: 1,
            step: 1,
            tooltip: "Top-K sampling parameter.",
            hasHandle: false,
        }),
    },
    outputs: {
        response: OutputBuilder.Message({
            displayName: "Response",
            tooltip: "The response from the model",
        })
    }
} as const satisfies Foundations.NodeDefinition