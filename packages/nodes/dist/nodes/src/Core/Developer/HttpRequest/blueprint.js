"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Developer.HttpRequest",
    displayName: "HTTP Request",
    description: "Makes an HTTP request.",
    icon: "Globe",
    proxyCompatible: true,
    toolCompatible: true,
    accent: "utility",
    iconColor: "color-blue-400",
    fields: [
        node_sdk_1.FieldBuilder.MultiOption("method", "Method", {
            options: [
                { value: "GET" },
                { value: "POST" },
                { value: "PUT" },
                { value: "DELETE" },
                { value: "PATCH" },
            ],
            initialValue: "GET",
            variant: "select"
        }),
        node_sdk_1.FieldBuilder.String("url", "URL", {
            initialValue: "https://api.example.com",
            placeholder: "https://api.example.com"
        }),
        node_sdk_1.FieldBuilder.Json("headers", "Headers", {
            initialValue: {}
        }),
        node_sdk_1.FieldBuilder.Json("body", "Body", {
            initialValue: {}
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Data("result", "Result", {
            tooltip: "{ status, data } — the response status code and parsed body."
        }),
    ],
    "isConvertedToTool==true": (0, node_sdk_1.defineTool)({
        fields: [],
        inputs: [],
        outputs: [
            node_sdk_1.OutputBuilder.ToolList("tools", "HTTP Request Tools"),
        ],
    }),
});
