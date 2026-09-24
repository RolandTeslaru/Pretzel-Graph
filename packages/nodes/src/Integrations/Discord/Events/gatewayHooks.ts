import { defineGatewayHooks } from '@pretzel-graph/node-sdk';
import { Chat, Gateway } from '@pretzel-graph/shared/domain';
import { Discord } from '../domain';
import { Blueprint } from './blueprint';

/**
 * Which server, channel and person an event concerns, in its own fields.
 *
 * Not every event has all three: a member joining has no channel, a DM has no server, a channel
 * being created has nobody. The scope builds a fingerprint from these and the filter matches its
 * allow lists against them, so both read the same answer.
 */
const eventSubjects = (event: Discord.Event) => {
    switch (event.type) {
        case 'messageCreate':
            return { server: event.guildId, channel: event.channelId, user: event.author.id };

        case 'messageUpdate':
        case 'messageDelete':
            return { server: event.guildId, channel: event.channelId, user: event.author?.id ?? null };

        case 'messageReactionAdd':
        case 'messageReactionRemove':
            return { server: null, channel: event.channelId, user: event.userId };

        case 'typingStart':
        case 'autoModerationActionExecution':
        case 'interactionCreate':
        case 'voiceStateUpdate':
            return { server: event.guildId, channel: event.channelId, user: event.userId };

        case 'guildMemberAdd':
        case 'guildMemberRemove':
        case 'guildMemberUpdate':
            return { server: event.guildId, channel: null, user: event.user?.id ?? null };

        case 'guildBanAdd':
        case 'guildBanRemove':
            return { server: event.guildId, channel: null, user: event.user.id };

        case 'presenceUpdate':
            return { server: event.guildId, channel: null, user: event.userId };

        case 'channelCreate':
        case 'channelDelete':
        case 'channelUpdate':
        case 'threadCreate':
        case 'threadDelete':
        case 'guildScheduledEventCreate':
        case 'guildScheduledEventUpdate':
        case 'guildScheduledEventDelete':
            return { server: event.guildId, channel: event.channelId, user: null };

        case 'inviteCreate':
        case 'inviteDelete':
            return { server: event.guildId, channel: event.channelId, user: event.inviterId };
    }
};

/**
 * Everything this node does with its connection's events, run in the backend ahead of any
 * execution: fingerprint the conversation, decide whether to run, record what came through.
 */
export const gatewayHooks = defineGatewayHooks<typeof Blueprint>()(Discord.Event.Schema, {

    /**
     * Which conversation an event belongs to, fingerprinted the same way every time.
     *
     * The field decides how much of the address goes in: nothing, the channel, or the channel and
     * the person. An event with no channel falls back to the connection alone.
     */
    scope: (event, { fieldValues, connection }) => {
        if (fieldValues.conversation_scope === 'none')
            return null;

        if (fieldValues.conversation_scope === 'shared')
            return Discord.createScope(connection.id);

        const { channel, user } = eventSubjects(event);

        if (!channel)
            return Discord.createScope(connection.id);

        return fieldValues.conversation_scope === 'channel_and_user'
            ? Discord.createScope(connection.id, channel, user ?? undefined)
            : Discord.createScope(connection.id, channel);
    },

    filter: (event, _scope, { fieldValues }) => {
        // The node listens to one event; everything else on the connection is not for it.
        if (event.type !== fieldValues.event)
            return false;

        const { server, channel, user } = eventSubjects(event);

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

            if (fieldValues.origin === 'dm' && !event.directMessage)
                return false;

            if (fieldValues.origin === 'server') {
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

    /**
     * Records every message the filter passed, whether or not it starts a run.
     *
     * The scope is deterministic and unique per conversation — which is exactly what a chat's
     * external key has to be, so it serves as one.
     */
    recorder: async (event, scope, { fieldValues, chatAPI }) => {
        if (fieldValues.conversation_scope === 'none' || event.type !== 'messageCreate')
            return;

        await chatAPI.append(Chat.ExternalKey.parse(scope), [{
            id:      Chat.Message.Id.parse(crypto.randomUUID()),
            role:    'human',
            content: event.content,
            data:    { name: event.author.name, additional_kwargs: { messageId: event.messageId } },
        }]);
    },

    igniter: async (_event, scope, { fieldValues, chatAPI }) => {
        if (fieldValues.conversation_scope === 'none')
            return {};

        const chatId = await chatAPI.findIdByExternalKey(Chat.ExternalKey.parse(scope));

        return chatId ? { chat_id: chatId } : {};
    },
});
