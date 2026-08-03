import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id:          "Core.Utils.Message.Compose",
    displayName: "Compose Message",
    description: "Builds a Human, System, or Tool message from a content string. Supports expressions to interpolate incoming data.",
    icon:        "Mail",
    accent:      "port-Message",
    fields: [
        FieldBuilder.MultiOption("role", "Role", {
            options: [
                { value: "Human" },
                { value: "System" },
                { value: "Tool" },
            ],
            initialValue: "Human",
            variant:      "tab",
        }),
        FieldBuilder.String("content", "Content", {
            initialValue: "",
            multiline:    true,
            placeholder:  "Message content",
            isExpression: true,
        }),
    ],
    inputs:  [],
    outputs: [
        OutputBuilder.Message("message", "Message", {}),
    ],

    "role==Tool": {
        fields: [
            FieldBuilder.String("toolCallId", "Tool Call ID", {
                initialValue: "",
                placeholder:  "Required for Tool messages",
            }),
        ],
    },
});
