import { defineGatewayHooks } from '@pretzel-graph/node-sdk';
import { Chat } from '@pretzel-graph/shared/domain';
import { Slack } from '../domain';
import { Blueprint } from './blueprint';

// Which channel, thread and person an event concerns; the scope and the filter both read this.
const eventSubjects = (event: Slack.Event) => {
    switch (event.type) {
        case 'message':
        case 'app_mention':
        case 'message_changed':
        case 'message_deleted':
        case 'block_actions':
            return { channel: event.channelId, thread: event.threadTs ?? event.messageTs, user: event.userId };

        case 'reaction_added':
        case 'reaction_removed':
        case 'pin_added':
        case 'pin_removed':
            return { channel: event.channelId, thread: null, user: event.userId };

        case 'shortcut':
            return { channel: event.channelId, thread: event.messageTs, user: event.userId };

        case 'slash_command':
        case 'app_home_opened':
        case 'channel_archive':
        case 'channel_unarchive':
        case 'member_joined_channel':
        case 'member_left_channel':
            return { channel: event.channelId, thread: null, user: event.userId };

        case 'view_submission':
        case 'team_join':
            return { channel: null, thread: null, user: event.userId };

        case 'channel_created':
            return { channel: event.channelId, thread: null, user: event.creatorId };

        case 'channel_deleted':
        case 'channel_rename':
            return { channel: event.channelId, thread: null, user: null };
    }
};

const isBlank = (value: string | null | undefined) => !value?.trim();

// Runs in the backend ahead of any execution: fingerprint the conversation, decide whether to run, open the chat.
export const gatewayHooks = defineGatewayHooks<typeof Blueprint>()(Slack.Event.Schema, {

    // An event missing the part the scope asks for falls back to the next wider one.
    scope: (event, { fieldValues, connection }) => {
        if (fieldValues.conversation_scope === 'none')
            return null;

        // The socket reports the bot before any event arrives; the row id is only a last resort.
        const botId = connection.remoteId ?? connection.id;

        if (fieldValues.conversation_scope === 'shared')
            return Slack.createScope(botId);

        const { channel, thread, user } = eventSubjects(event);

        if (!channel)
            return Slack.createScope(botId);

        if (fieldValues.conversation_scope === 'thread')
            return Slack.createScope(botId, { channelId: channel, threadTs: thread ?? undefined });

        if (fieldValues.conversation_scope === 'channel_and_user')
            return Slack.createScope(botId, { channelId: channel, userId: user ?? undefined });

        return Slack.createScope(botId, { channelId: channel });
    },

    filter: (event, _scope, { fieldValues }) => {
        // The node listens to one event; everything else on the connection is not for it.
        if (event.type !== fieldValues.event)
            return false;

        const { channel, user } = eventSubjects(event);

        // Each list restricts only when it has entries, and an event without that part never matches one.
        const channels = fieldValues.channel_ids.filter(Boolean);
        const users    = fieldValues.allowed_user_ids.filter(Boolean);

        if (channels.length && (channel === null || !channels.includes(channel)))
            return false;

        if (users.length && (user === null || !users.includes(user)))
            return false;

        if (event.type === 'message' && fieldValues.event === 'message') {
            if (!fieldValues.allow_bot_messages && (event.botId || event.subtype === 'bot_message'))
                return false;

            if (!fieldValues.thread_replies && event.threadTs && event.threadTs !== event.messageTs)
                return false;

            if (fieldValues.origin === 'dm' && !event.directMessage)
                return false;

            if (fieldValues.origin === 'channel') {
                if (event.directMessage)
                    return false;

                if (fieldValues.require_mention && !event.mentionsMe)
                    return false;
            }
        }

        if (event.type === 'reaction_added' && fieldValues.event === 'reaction_added')
            return isBlank(fieldValues.reaction_add_emoji) || event.reaction === stripColons(fieldValues.reaction_add_emoji);

        if (event.type === 'reaction_removed' && fieldValues.event === 'reaction_removed')
            return isBlank(fieldValues.reaction_remove_emoji) || event.reaction === stripColons(fieldValues.reaction_remove_emoji);

        if (event.type === 'slash_command' && fieldValues.event === 'slash_command')
            return isBlank(fieldValues.command_name) || event.command === withSlash(fieldValues.command_name);

        if (event.type === 'block_actions' && fieldValues.event === 'block_actions') {
            const actionIds = fieldValues.action_ids.filter(Boolean);

            return !actionIds.length || event.actions.some(action => actionIds.includes(action.actionId));
        }

        if (event.type === 'view_submission' && fieldValues.event === 'view_submission')
            return isBlank(fieldValues.view_callback_id) || event.callbackId === fieldValues.view_callback_id.trim();

        if (event.type === 'shortcut' && fieldValues.event === 'shortcut')
            return isBlank(fieldValues.shortcut_callback_id) || event.callbackId === fieldValues.shortcut_callback_id.trim();

        return true;
    },

    // An empty append opens the chat on the first event and writes nothing; the workflow fills it.
    igniter: async (_event, scope, { fieldValues, chatAPI }) => {
        if (fieldValues.conversation_scope === 'none')
            return {};

        return { chat_id: await chatAPI.append(Chat.ExternalKey.parse(scope), []) };
    },
});

const stripColons = (emoji: string) => emoji.trim().replace(/^:|:$/g, '');

const withSlash = (command: string) => command.trim().startsWith('/') ? command.trim() : `/${command.trim()}`;
