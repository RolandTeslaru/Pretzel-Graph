import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Routing.Portal",
    displayName: "Portal",
    description: "Sends data to all Portal Out nodes sharing the same Portal ID, without a visible edge.",
    icon: "PortalIn",
    accent: "group-routing",
    iconColor: "color-sky-400",
    passive: true,
    fields: [
        FieldBuilder.MultiOption("direction", "Direction", {
            variant: "tab",
            initialValue: "in",

            options: [
                { value: "in", displayName: "In" },
                { value: "out", displayName: "Out" },
            ]
        }),
        FieldBuilder.UniqueString("portalId", "Portal ID", {
            required: true
        }),
    ],
    inputs: [],
    outputs: [],

    "direction==in": {
        ui: {
            icon: "PortalIn",
        },
        inputs: [
            InputBuilder.Unresolved("input", "Input", {
                polymorphicGroupId: "portal"
            }),
        ],
        replaces: ["inputs", "outputs"],
    },

    "direction==out": {
        ui: {
            icon: "PortalOut",
        },
        outputs: [
            OutputBuilder.Unresolved("output", "Output", {
                polymorphicGroupId: "portal"
            }),
        ],
        replaces: ["inputs", "outputs"],
    },
});
