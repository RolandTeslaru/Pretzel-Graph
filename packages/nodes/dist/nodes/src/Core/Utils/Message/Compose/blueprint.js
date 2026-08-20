"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Utils.Message.Compose",
    displayName: "Compose Message",
    description: "Builds a Human, System, or Tool message from a content string. Supports expressions to interpolate incoming data.",
    icon: "Mail",
    accent: "port-Message",
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("role", "Role", {
            options: [
                { value: "Human" },
                { value: "System" },
                { value: "Tool" },
            ],
            initialValue: "Human",
            variant: "tab",
        }),
        node_sdk_1.FieldBuilder.String("content", "Content", {
            initialValue: "",
            multiline: true,
            placeholder: "Message content",
            isExpressionInitially: true,
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Message("message", "Message", {}),
    ],
    "role==Tool": {
        fields: [
            node_sdk_1.FieldBuilder.String("toolCallId", "Tool Call ID", {
                initialValue: "",
                placeholder: "Required for Tool messages",
            }),
        ],
    },
});
