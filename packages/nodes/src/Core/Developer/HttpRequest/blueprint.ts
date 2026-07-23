import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.HttpRequest",
    displayName: "HTTP Request",
    description: "Makes an HTTP request.",
    icon: "Globe",
    proxyCompatible: true,
    accent: "utility",
    iconColor: "color-blue-400",
    fields: [
        FieldBuilder.MultiOption({
            id: "method",
            displayName: "Method",
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
        FieldBuilder.String({
            id: "url",
            displayName: "URL",
            initialValue: "https://api.example.com",
            placeholder: "https://api.example.com",
        }),
        FieldBuilder.Json({
            id: "headers",
            displayName: "Headers",
            initialValue: {},
        }),
        FieldBuilder.Json({
            id: "body",
            displayName: "Body",
            initialValue: {},
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.Data({
            id: "result",
            displayName: "Result",
            tooltip: "{ status, data } — the response status code and parsed body.",
        }),
    ],
});
