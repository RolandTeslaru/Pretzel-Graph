import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { OpenAI } from "@pretzel-graph/nodes/Credentials/OpenAI";

export const Blueprint = defineBlueprint({
    id: "Integrations.OpenAI.Chat",
    displayName: "OpenAI Chat",
    description: "This node talks to OpenAI's GPT chat models",
    icon: "OpenAI",
    accent: "port-LanguageModel",
    credentials: [OpenAI],
    fields: [
        FieldBuilder.MultiOption("model", "Model", {
            options: [
                { value: "gpt-5.6-sol", displayName: "GPT-5.6 Sol" },
                { value: "gpt-5.6-terra", displayName: "GPT-5.6 Terra" },
                { value: "gpt-5.6-luna", displayName: "GPT-5.6 Luna" },
            ],

            initialValue: "gpt-5.6-terra"
        }),
        FieldBuilder.MultiOption("reasoningEffort", "Reasoning Effort", {
            options: [
                { value: "none", displayName: "None", description: "Answer directly, without thinking first. Fastest and cheapest." },
                { value: "low", displayName: "Low", description: "A brief pass of thinking before answering." },
                { value: "medium", displayName: "Medium", description: "Balanced thinking. A good default." },
                { value: "high", displayName: "High", description: "Extended thinking for harder problems." },
                { value: "xhigh", displayName: "Extra High", description: "Maximum thinking. Slowest and most expensive." },
            ],

            initialValue: "medium",
            tooltip: "How much the model thinks before it answers. More reasoning helps on difficult work, but costs more tokens and takes longer."
        }),
        FieldBuilder.Integer("maxTokens", "Max Tokens", {
            min: 1,
            step: 1,
            tooltip: "The maximum number of tokens to generate in the chat completion."
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.LanguageModel("languageModel", "Language Model", {
            tooltip: "The language model instance used for this response, useful for chaining calls with the same model and settings."
        })
    ]
})
