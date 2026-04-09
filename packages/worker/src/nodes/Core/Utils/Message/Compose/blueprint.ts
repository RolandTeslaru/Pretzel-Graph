import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Message.Compose",
    displayName: "Compose Message",
    description: "Converts any data into a Human, System, or Tool message by serializing it into the message content.",
    icon: "Mail",
    accent: "port-Message",
    fields: [
        FieldBuilder.MultiOption({
            id: "role",
            displayName: "Role",
            options: [
                { value: "Human" },
                { value: "System" },
                { value: "Tool" },
            ],
            initialValue: "Human",
            variant: "tab",
            reconcile: true,
        }),
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "data",
            displayName: "Data",
            polymorphicGroupId: "data",
            required: true
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "message",
            displayName: "Message",
        }),
    ],
});
