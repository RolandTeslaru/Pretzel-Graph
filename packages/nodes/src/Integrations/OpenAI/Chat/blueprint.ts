import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { OpenAI } from "@pretzel-graph/nodes/Credentials/OpenAI";

export const Blueprint = defineBlueprint({
    id: "Integrations.OpenAI.Chat",
    displayName: "OpenAI Chat",
    description: "This node talks to OpenAI's GPT chat models via the Chat Completions API",
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
