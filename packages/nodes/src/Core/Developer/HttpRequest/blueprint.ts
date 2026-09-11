import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.HttpRequest",
    displayName: "HTTP Request",
    description: "Makes an HTTP request.",
    icon: "Globe",
    proxyCompatible: true,
    toolCompatible: true,
    accent: "utility",
    iconColor: "color-blue-400",
    fields: [
        defineField.MultiOption("method", "Method", {
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
        defineField.String("url", "URL", {
            initialValue: "https://api.example.com",
            placeholder: "https://api.example.com"
        }),
        defineField.Json("headers", "Headers", {
            initialValue: {}
        }),
        defineField.Json("body", "Body", {
            initialValue: {}
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.Data("result", "Result", {
            tooltip: "{ status, data } — the response status code and parsed body."
        }),
    ],

    "isConvertedToTool==true": defineTool({
        fields: [],
        inputs: [],
        outputs: [
            defineOutput.ToolList("tools", "HTTP Request Tools"),
        ],
    }),
});
