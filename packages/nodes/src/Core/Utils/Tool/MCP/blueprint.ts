import { defineBlueprint, defineField, defineOutput } from "@pretzel-graph/node-sdk";
import { MCPAuth } from "../../../../Credentials";

export const Blueprint = defineBlueprint({
    id: "Core.Utils.Tool.MCP",
    displayName: "MCP Tools",
    description: "Exposes the tools of an MCP server to an agent.",
    icon: "MCP",
    accent: "port-Tool",
    credentials: [MCPAuth],
    fields: [
        defineField.MultiOption("transport", "Transport", {
            variant: "tab",
            options: [
                { value: "stdio", displayName: "Stdio" },
                { value: "http", displayName: "HTTP" },
            ],
            initialValue: "stdio",
            tooltip: "Stdio spawns the server as a local process. HTTP connects to a hosted server."
        }),
        defineField.Json("include", "Include Tools", {
            initialValue: [],
            tooltip: "Names of the tools to expose. Leave empty to expose every tool the server offers."
        }),
    ],
    inputs: [],
    outputs: [
        defineOutput.ToolList("tools", "Tools", {
            tooltip: "The server's tools, ready to wire into a Language Model."
        }),
    ],

    "transport==stdio": {
        fields: [
            defineField.String("command", "Command", {
                initialValue: "",
                placeholder: "npx",
                tooltip: "The executable to spawn."
            }),
            defineField.Json("args", "Arguments", {
                initialValue: [],
                tooltip: "Array of arguments, e.g. [\"-y\", \"@scope/mcp-server\"]."
            }),
            defineField.String("cwd", "Working Directory", {
                initialValue: "",
                tooltip: "Optional working directory for the spawned process."
            }),
        ],
    },

    "transport==http": {
        fields: [
            defineField.String("url", "Server URL", {
                initialValue: "",
                placeholder: "https://example.com/mcp",
                tooltip: "The MCP endpoint."
            }),
            defineField.Json("headers", "Extra Headers", {
                initialValue: {},
                tooltip: "Non-secret headers merged into every request. The bearer token comes from the credential."
            }),
        ],
    },
});
