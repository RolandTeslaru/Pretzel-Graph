import { defineConnection } from "@pretzel-graph/node-sdk";
import { DiscordBot } from "@pretzel-graph/nodes/Credentials";

export const Definition = defineConnection({
    id: "Connections.Discord",
    displayName: "Discord",
    fields: [
        
    ],
    credentials: [DiscordBot],
})