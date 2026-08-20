"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Routing.Portal",
    displayName: "Portal",
    description: "Sends data to all Portal Out nodes sharing the same Portal ID, without a visible edge.",
    icon: "PortalIn",
    accent: "group-routing",
    iconColor: "color-sky-400",
    passive: true,
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("direction", "Direction", {
            variant: "tab",
            initialValue: "in",
            options: [
                { value: "in", displayName: "In" },
                { value: "out", displayName: "Out" },
            ]
        }),
        node_sdk_1.FieldBuilder.UniqueString("portalId", "Portal ID", {
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
            node_sdk_1.InputBuilder.Unresolved("input", "Input", {
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
            node_sdk_1.OutputBuilder.Unresolved("output", "Output", {
                polymorphicGroupId: "portal"
            }),
        ],
        replaces: ["inputs", "outputs"],
    },
});
