import { defineBlueprint, FieldBuilder, InputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Portal",
    displayName: "Portal",
    description: "Sends data to all Portal Out nodes sharing the same Portal ID, without a visible edge.",
    icon: "PortalIn",
    accent: "group-routing",
    iconColor: "color-sky-400",
    fields: [
        FieldBuilder.reconciling(FieldBuilder.MultiOption({
            id: "direction",
            variant: "tab",
            initialValue: "in",
            displayName: "Direction",
            options: [
                { value: "in", displayName: "In" },
                { value: "out", displayName: "Out" },
            ]
        })),
        FieldBuilder.UniqueString({
            id: "portalId",
            displayName: "Portal ID",
            required: true,
        }),

        
    ],
    inputs: [
        InputBuilder.Unresolved({
            id: "input",
            displayName: "Input",
            polymorphicGroupId: "portal",
        }),
    ],
    outputs: [],
});
