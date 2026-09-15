import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

/**
 * Secrets only. How to reach the server (transport, url, command, args) lives on the
 * node, where conditional fields can hide what the chosen transport does not use.
 */
export const MCPAuth = defineCredential({
    id: "mcpAuth",
    displayName: "MCP Auth",
    icon: "MCP",
    optional: true,
    fields: [
        defineField.Password("token", "Bearer Token", {
            tooltip: "HTTP transport. Sent as `Authorization: Bearer …`."
        }),
        defineField.Json("env", "Environment", {
            initialValue: {},
            tooltip: "Stdio transport. Environment variables for the spawned process — a server's own API keys go here."
        }),
    ],
})
