import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.HttpRequest",
    displayName: "HTTP Request",
    description: "Makes an HTTP request.",
    icon: "Globe",
    accent: "port-null",
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
    inputs: [
        InputBuilder.Message({
            id: "trigger",
            displayName: "Trigger",
            required: false,
        })
    ],
    outputs: [
        OutputBuilder.Json({
            id: "response",
            displayName: "Response",
        }),
        OutputBuilder.Integer({
            id: "status",
            displayName: "Status",
        })
    ],
});
