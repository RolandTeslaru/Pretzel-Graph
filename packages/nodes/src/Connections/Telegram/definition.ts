import { defineConnection } from "@pretzel-graph/node-sdk";
import { TelegramBot } from "@pretzel-graph/nodes/Credentials";
import { Telegram } from "@pretzel-graph/nodes/Integrations/Telegram/domain";

// The socket asks Telegram for every update type, so the connection has no fields of its own.
export const Definition = defineConnection({
    id: "Connections.Telegram",
    provider: Telegram.PROVIDER,
    displayName: "Telegram",
    description: "Listens to a Telegram bot's messages, button presses and chat changes.",
    icon: "Telegram",
    fields: [],
    credentials: [TelegramBot],
})
