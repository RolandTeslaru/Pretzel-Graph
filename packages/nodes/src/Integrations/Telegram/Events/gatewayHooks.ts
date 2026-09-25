import { defineGatewayHooks } from '@pretzel-graph/node-sdk';
import { Chat } from '@pretzel-graph/shared/domain';
import { Telegram } from '../domain';
import { Blueprint } from './blueprint';

// Which chat, topic and person an event concerns; the scope and the filter both read this.
const eventSubjects = (event: Telegram.Event) => {
    switch (event.type) {
        case 'message':
        case 'edited_message':
        case 'channel_post':
        case 'edited_channel_post':
            return { chat: event.chatId, topic: event.topicId, user: event.from?.id ?? null };

        case 'callback_query':
            return { chat: event.chatId, topic: event.topicId, user: event.from.id };

        case 'message_reaction':
            return { chat: event.chatId, topic: null, user: event.user?.id ?? null };

        case 'my_chat_member':
        case 'chat_member':
        case 'chat_join_request':
            return { chat: event.chatId, topic: null, user: event.from.id };

        case 'poll_answer':
            return { chat: null, topic: null, user: event.user?.id ?? null };
    }
};

const isBlank = (value: string | null | undefined) => !value?.trim();

// Runs in the backend ahead of any execution: fingerprint the conversation, decide whether to run, open the chat.
export const gatewayHooks = defineGatewayHooks<typeof Blueprint>()(Telegram.Event.Schema, {

    // An event missing the part the scope asks for falls back to the next wider one.
    scope: (event, { fieldValues, connection }) => {
        if (fieldValues.conversation_scope === 'none')
            return null;

        // The socket reports the bot before any event arrives; the row id is only a last resort.
        const botId = connection.remoteId ?? connection.id;

        if (fieldValues.conversation_scope === 'shared')
            return Telegram.createScope(botId);

        const { chat, topic, user } = eventSubjects(event);

        if (!chat)
            return Telegram.createScope(botId);

        if (fieldValues.conversation_scope === 'topic')
            return Telegram.createScope(botId, { chatId: chat, topicId: topic ?? undefined });

        if (fieldValues.conversation_scope === 'chat_and_user')
            return Telegram.createScope(botId, { chatId: chat, userId: user ?? undefined });

        return Telegram.createScope(botId, { chatId: chat });
    },

    filter: (event, _scope, { fieldValues }) => {
        // The node listens to one event; everything else on the connection is not for it.
        if (event.type !== fieldValues.event)
            return false;

        const { chat, user } = eventSubjects(event);

        // Each list restricts only when it has entries, and an event without that part never matches one.
        const chats = fieldValues.chat_ids.filter(Boolean);
        const users = fieldValues.allowed_user_ids.filter(Boolean);

        if (chats.length && (chat === null || !chats.includes(chat)))
            return false;

        if (users.length && (user === null || !users.includes(user)))
            return false;

        if (event.type === 'message' && fieldValues.event === 'message') {
            if (!isBlank(fieldValues.command_name) && event.command?.toLowerCase() !== withSlash(fieldValues.command_name).toLowerCase())
                return false;

            if (fieldValues.origin === 'private' && !event.directMessage)
                return false;

            if (fieldValues.origin === 'group') {
                if (event.directMessage)
                    return false;

                if (fieldValues.require_mention && !event.mentionsMe)
                    return false;
            }
        }

        if (event.type === 'callback_query' && fieldValues.event === 'callback_query')
            return isBlank(fieldValues.callback_data_prefix) || (event.data ?? '').startsWith(fieldValues.callback_data_prefix.trim());

        if (event.type === 'message_reaction' && fieldValues.event === 'message_reaction')
            return isBlank(fieldValues.reaction_emoji) || event.added.includes(fieldValues.reaction_emoji.trim());

        return true;
    },

    // An empty append opens the chat on the first event and writes nothing; the workflow fills it.
    igniter: async (_event, scope, { fieldValues, chatAPI }) => {
        if (fieldValues.conversation_scope === 'none')
            return {};

        return { chat_id: await chatAPI.append(Chat.ExternalKey.parse(scope), []) };
    },
});

const withSlash = (command: string) => command.trim().startsWith('/') ? command.trim() : `/${command.trim()}`;
