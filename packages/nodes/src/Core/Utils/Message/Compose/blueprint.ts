import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Message.Compose",
    displayName: "Compose Message",
    description: "Builds a Human, System, or Tool message from a content string. Supports expressions to interpolate incoming data.",
    icon: "Mail",
    accent: "port-Message",
    fields: [
        FieldBuilder.reconciling(FieldBuilder.MultiOption({
            id: "role",
            displayName: "Role",
            options: [
                { value: "Human" },
                { value: "System" },
                { value: "Tool" },
            ],
            initialValue: "Human",
            variant: "tab",
        })),
        FieldBuilder.String({
            id: "content",
            displayName: "Content",
            initialValue: "",
            multiline: true,
            placeholder: "Message content",
            isExpression: true,
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Message({
            id: "message",
            displayName: "Message",
        }),
    ],
});
