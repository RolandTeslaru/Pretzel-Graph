import { defineGatewayFilter } from '@pretzel-graph/node-sdk';
import { Discord } from '../domain';
import { Blueprint } from './blueprint';

// Runs in the backend, per event, before any execution exists.
export const gatewayFilter = defineGatewayFilter<typeof Blueprint>()(Discord.Event.Schema,
    (event, ctx) => {
        
        const { fieldValues } = ctx

        // The node listens to one event; everything else on the connection is not for it.
        if (event.type !== fieldValues.event)
            return false;

        // Which server, channel and person an event belongs to, said once per event in its own
        // fields. Not every event has all three: a member joining has no channel, a DM has no
        // server, a channel being created has nobody.
        let server:  string | null = null;
        let channel: string | null = null;
        let user:    string | null = null;

        switch (event.type) {
            case 'messageCreate':
                server = event.guildId; channel = event.channelId; user = event.author.id;
                break;

            case 'messageUpdate':
            case 'messageDelete':
                server = event.guildId; channel = event.channelId; user = event.author?.id ?? null;
                break;

            case 'messageReactionAdd':
            case 'messageReactionRemove':
                channel = event.channelId; user = event.userId;
                break;

            case 'typingStart':
            case 'autoModerationActionExecution':
            case 'interactionCreate':
                server = event.guildId; channel = event.channelId; user = event.userId;
                break;

            case 'guildMemberAdd':
            case 'guildMemberRemove':
            case 'guildMemberUpdate':
                server = event.guildId; user = event.user?.id ?? null;
                break;

            case 'guildBanAdd':
            case 'guildBanRemove':
                server = event.guildId; user = event.user.id;
                break;

            case 'voiceStateUpdate':
                server = event.guildId; channel = event.channelId; user = event.userId;
                break;

            case 'presenceUpdate':
                server = event.guildId; user = event.userId;
                break;

            case 'channelCreate':
            case 'channelDelete':
            case 'channelUpdate':
            case 'threadCreate':
            case 'threadDelete':
                server = event.guildId; channel = event.channelId;
                break;

            case 'inviteCreate':
            case 'inviteDelete':
                server = event.guildId; channel = event.channelId; user = event.inviterId;
                break;

            case 'guildScheduledEventCreate':
            case 'guildScheduledEventUpdate':
            case 'guildScheduledEventDelete':
                server = event.guildId; channel = event.channelId;
                break;
        }

        // Each list restricts only when it has entries, and an event with no server, channel
        // or person can never satisfy a list that does.
        const servers  = fieldValues.server_ids.filter(Boolean);
        const channels = fieldValues.channel_ids.filter(Boolean);
        const users    = fieldValues.allowed_user_ids.filter(Boolean);

        if (servers.length && (server === null || !servers.includes(server)))
            return false;

        if (channels.length && (channel === null || !channels.includes(channel)))
            return false;

        if (users.length && (user === null || !users.includes(user)))
            return false;

        if (event.type === 'messageCreate' && fieldValues.event === 'messageCreate') {
            if (!fieldValues.allow_bot_messages && event.author.bot)
                return false;

            if (fieldValues.scope === 'dm' && !event.directMessage)
                return false;

            if (fieldValues.scope === 'server') {
                if (event.directMessage)
                    return false;

                if (fieldValues.require_mention && !event.mentionsMe)
                    return false;
            }
        }

        if (event.type === 'messageReactionAdd' && fieldValues.event === 'messageReactionAdd')
            return !fieldValues.reaction_add_emoji || event.emoji === fieldValues.reaction_add_emoji;

        if (event.type === 'messageReactionRemove' && fieldValues.event === 'messageReactionRemove')
            return !fieldValues.reaction_remove_emoji || event.emoji === fieldValues.reaction_remove_emoji;

        return true;
    },
);
