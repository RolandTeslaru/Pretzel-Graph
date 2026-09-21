import { defineConnection, defineField } from "@pretzel-graph/node-sdk";
import { WebSocketToken } from "@pretzel-graph/nodes/Credentials";

export const Definition = defineConnection({
    id: "Connections.WebSocket",
    displayName: "WebSocket",
    description: "Listens to any WebSocket server.",
    fields: [
        defineField.String("url", "URL", {
            required: true,
            tooltip: "The server to connect to, starting with ws:// or wss://.",
        }),
        defineField.MultiOption("auth", "Authentication", {
            options: [
                { value: "none",   displayName: "None" },
                { value: "bearer", displayName: "Bearer Header" },
                { value: "query",  displayName: "Query Parameter" },
            ],
            initialValue: "none",
            tooltip: "How the token reaches the server when it opens the connection.",
        }),
        defineField.List("protocols", "Subprotocols", {
            tooltip: "Offered to the server on connect. Leave empty unless the server asks for one.",
        }),
        defineField.MultiOption("format", "Message Format", {
            options: [
                { value: "json", displayName: "JSON" },
                { value: "text", displayName: "Text" },
            ],
            initialValue: "json",
            tooltip: "JSON messages are parsed; text is passed through as is.",
        }),
    ],
    "auth!=none": {
        credentials: [WebSocketToken],
    },
    "auth==query": {
        fields: [
            defineField.String("queryParameter", "Parameter Name", {
                initialValue: "token",
                tooltip: "The query parameter the token is sent in, e.g. ?token=…",
            }),
        ],
    },
})
