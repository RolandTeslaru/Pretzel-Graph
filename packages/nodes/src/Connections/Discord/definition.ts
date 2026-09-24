import { defineConnection, defineField } from "@pretzel-graph/node-sdk";
import { DiscordBot } from "@pretzel-graph/nodes/Credentials";
import { Discord } from "@pretzel-graph/nodes/Integrations/Discord/domain";

// Intents decide which events Discord pushes down the socket. They do not affect REST calls, and an
// event nothing listens to still costs nothing, so the defaults cover messages and little else.
const intent = (id: string, displayName: string, tooltip: string, on = false, advanced = false) =>
    defineField.Boolean(id, displayName, { initialValue: on, appearance: "checkbox", tooltip, advanced });

export const Definition = defineConnection({
    id: "Connections.Discord",
    provider: Discord.PROVIDER,
    displayName: "Discord",
    description: "Listens to a Discord bot's messages.",
    icon: "Discord",
    fields: [
        intent("guilds", "Guilds",
            "Server, channel and thread lifecycle. Needed for a message to resolve which server and channel it came from.", true),

        intent("direct_messages", "Direct Messages",
            "Messages sent to the bot in a DM.", true),

        intent("guild_messages", "Server Messages",
            "Messages in channels of servers the bot has joined. Without this, only direct messages arrive."),

        intent("message_content", "Message Content",
            "Privileged. Needed to read the text of server messages that do not mention the bot. Enable the Message Content Intent in the Discord developer portal first, or the connection will be refused."),

        intent("guild_members", "Server Members",
            "Privileged. Fills in a message author's nickname and roles, and is required to list or search members. Enable the Server Members Intent in the developer portal first."),

        // Everything below only matters once something listens for those events.
        intent("guild_message_reactions", "Server Message Reactions", "Reactions added and removed in server channels.", false, true),
        intent("direct_message_reactions", "Direct Message Reactions", "Reactions added and removed in DMs.", false, true),
        intent("guild_message_typing", "Server Typing", "Typing indicators in server channels.", false, true),
        intent("direct_message_typing", "Direct Message Typing", "Typing indicators in DMs.", false, true),
        intent("guild_message_polls", "Server Polls", "Poll votes in server channels.", false, true),
        intent("direct_message_polls", "Direct Message Polls", "Poll votes in DMs.", false, true),
        intent("guild_voice_states", "Voice States", "Members joining, leaving and moving between voice channels.", false, true),
        intent("guild_presences", "Presences", "Privileged. Member online status and activity. Enable the Presence Intent in the developer portal first.", false, true),
        intent("guild_moderation", "Moderation", "Bans, unbans and audit log entries.", false, true),
        intent("guild_expressions", "Expressions", "Custom emoji, stickers and soundboard sounds changing.", false, true),
        intent("guild_integrations", "Integrations", "App integrations being added, changed or removed.", false, true),
        intent("guild_webhooks", "Webhooks", "Webhooks being created, changed or deleted in a channel.", false, true),
        intent("guild_invites", "Invites", "Invites being created and deleted.", false, true),
        intent("guild_scheduled_events", "Scheduled Events", "Server events being created, changed or cancelled.", false, true),
        intent("auto_moderation_configuration", "AutoMod Rules", "AutoMod rules being created, changed or deleted.", false, true),
        intent("auto_moderation_execution", "AutoMod Actions", "AutoMod acting on a message.", false, true),
    ],
    credentials: [DiscordBot],
})
