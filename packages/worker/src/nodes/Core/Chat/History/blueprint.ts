import { FieldBuilder, defineBlueprint, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Chat.History",
    displayName: "Chat History",
    description: "Stores and retrieves conversation history for chat sessions",
    icon: "History",
    accent: "port-Message",
    fields: [
        FieldBuilder.Integer({
            id: "maxTokensPercentage",
            displayName: "Max Tokens Percentage",
            required: false,
            initialValue: 80,
            min: 10,
            max: 90,
            step: 1,
            slider: true,
            tooltip: "Percentage at whitch the context window gets summerized"
        }),
    ],
    inputs: [
        InputBuilder.LanguageModel({
            id: "summerizationLLM",
            displayName: "Summerization LLM",
            required: true
        })
    ],
    outputs: [
        OutputBuilder.MessageList({
            id: "messages",
            displayName: "Messages",
            tooltip: "The conversation history from memory",
        }),
    ],
});
