import type { z } from 'zod';

import { Telegram } from '../../Integrations/Telegram/domain';

type Body<T_Schema extends z.ZodType> = Omit<z.infer<T_Schema>, 'type' | 'updateId' | 'directMessage' | 'mentionsMe'>;

// Update payloads are loosely typed JSON; every read goes through these so a missing key is null.
type Raw = Record<string, any>;

export interface BotIdentity {
    id:       string
    username: string | null
}

const text = (value: unknown) => typeof value === 'string' ? value : null;

const id = (value: unknown) => value === undefined || value === null ? null : String(value);

const user = (value: Raw | undefined | null): Telegram.User | null => value
    ? {
        id:       String(value.id),
        name:     [value.first_name, value.last_name].filter(Boolean).join(' ') || value.title || String(value.id),
        username: text(value.username),
        bot:      Boolean(value.is_bot),
    }
    : null;

const chatType = (value: unknown): Telegram.ChatType =>
    Telegram.ChatType.safeParse(value).data ?? 'private';

const chatTitle = (chat: Raw) =>
    text(chat.title) ?? ([chat.first_name, chat.last_name].filter(Boolean).join(' ') || null);

// Forum topics carry a thread id; a reply chain elsewhere reuses the field, so only topics count.
const topicId = (message: Raw) =>
    message.is_topic_message ? id(message.message_thread_id) : null;

const FILE_KINDS = ['document', 'audio', 'voice', 'video', 'video_note', 'animation', 'sticker'] as const;

const files = (message: Raw): Telegram.File[] => {
    const found: Telegram.File[] = [];

    // Photos arrive as several sizes, largest last.
    if (Array.isArray(message.photo) && message.photo.length) {
        const largest = message.photo[message.photo.length - 1];

        found.push({ kind: 'photo', fileId: largest.file_id, fileName: null, mimeType: 'image/jpeg', size: largest.file_size ?? null });
    }

    for (const kind of FILE_KINDS) {
        const file = message[kind];

        if (file?.file_id)
            found.push({
                kind,
                fileId:   file.file_id,
                fileName: text(file.file_name),
                mimeType: text(file.mime_type),
                size:     file.file_size ?? null,
            });
    }

    return found;
};

// A leading /command, dropped when it names a different bot ("/start@otherbot").
const command = (message: Raw, me: BotIdentity) => {
    const body    = message.text ?? message.caption ?? '';
    const entity  = (message.entities ?? message.caption_entities ?? []).find((e: Raw) => e.type === 'bot_command' && e.offset === 0);

    if (!entity)
        return { command: null, commandArgs: null };

    const [name, target] = body.slice(0, entity.length).split('@');

    if (target && me.username && target.toLowerCase() !== me.username.toLowerCase())
        return { command: null, commandArgs: null };

    return { command: name, commandArgs: body.slice(entity.length).trim() || null };
};

const message = (value: Raw, me: BotIdentity) => ({
    messageId:        value.message_id,
    chatId:           String(value.chat.id),
    chatType:         chatType(value.chat.type),
    chatTitle:        chatTitle(value.chat),
    topicId:          topicId(value),
    from:             user(value.from ?? value.sender_chat),
    text:             value.text ?? value.caption ?? '',
    ...command(value, me),
    replyToMessageId: value.reply_to_message?.message_id ?? null,
    files:            files(value),
    createdAt:        Telegram.unixToISO(value.date),
});

const member = (value: Raw) => ({
    chatId:    String(value.chat.id),
    chatType:  chatType(value.chat.type),
    chatTitle: chatTitle(value.chat),
    from:      user(value.from)!,
    member:    user(value.new_chat_member?.user)!,
    status:    value.new_chat_member?.status ?? 'unknown',
    oldStatus: value.old_chat_member?.status ?? 'unknown',
});

const reactions = (list: unknown) => Array.isArray(list)
    ? list.map((reaction: Raw) => reaction.emoji ?? reaction.custom_emoji_id ?? reaction.type)
    : [];


// One mapper per update type, each annotated with the schema it fills.
export const Mapper = {

    message: (value: Raw, me: BotIdentity): Body<typeof Telegram.Event.Message.Create> => message(value, me),

    edited_message: (value: Raw, me: BotIdentity): Body<typeof Telegram.Event.Message.Edit> => ({
        ...message(value, me),
        editedAt: Telegram.unixToISO(value.edit_date),
    }),

    channel_post: (value: Raw, me: BotIdentity): Body<typeof Telegram.Event.ChannelPost.Create> => message(value, me),

    edited_channel_post: (value: Raw, me: BotIdentity): Body<typeof Telegram.Event.ChannelPost.Edit> => ({
        ...message(value, me),
        editedAt: Telegram.unixToISO(value.edit_date),
    }),

    callback_query: (value: Raw): Body<typeof Telegram.Event.CallbackQuery.Create> => ({
        queryId:         value.id,
        from:            user(value.from)!,
        chatId:          id(value.message?.chat?.id),
        chatType:        value.message?.chat ? chatType(value.message.chat.type) : null,
        topicId:         value.message ? topicId(value.message) : null,
        messageId:       value.message?.message_id ?? null,
        inlineMessageId: text(value.inline_message_id),
        data:            text(value.data),
    }),

    message_reaction: (value: Raw): Body<typeof Telegram.Event.Reaction.Update> => {
        const before = reactions(value.old_reaction);
        const after  = reactions(value.new_reaction);

        return {
            chatId:    String(value.chat.id),
            chatType:  chatType(value.chat.type),
            messageId: value.message_id,
            user:      user(value.user ?? value.actor_chat),
            added:     after.filter(emoji => !before.includes(emoji)),
            removed:   before.filter(emoji => !after.includes(emoji)),
        };
    },

    my_chat_member: (value: Raw): Body<typeof Telegram.Event.Member.Bot> => member(value),

    chat_member: (value: Raw): Body<typeof Telegram.Event.Member.Other> => member(value),

    chat_join_request: (value: Raw): Body<typeof Telegram.Event.Member.JoinRequest> => ({
        chatId:     String(value.chat.id),
        chatType:   chatType(value.chat.type),
        chatTitle:  chatTitle(value.chat),
        from:       user(value.from)!,
        bio:        text(value.bio),
        inviteLink: text(value.invite_link?.invite_link),
    }),

    poll_answer: (value: Raw): Body<typeof Telegram.Event.Poll.Answer> => ({
        pollId:    value.poll_id,
        user:      user(value.user ?? value.voter_chat),
        optionIds: value.option_ids ?? [],
    }),
};


// Whether a message is addressed to this bot: an @mention, a text mention, a reply to it, or a command naming it.
export const mentionsBot = (value: Raw, me: BotIdentity) => {
    const body     = value.text ?? value.caption ?? '';
    const entities = value.entities ?? value.caption_entities ?? [];
    const username = me.username?.toLowerCase() ?? null;

    if (value.reply_to_message?.from?.id !== undefined && String(value.reply_to_message.from.id) === me.id)
        return true;

    return entities.some((entity: Raw) => {
        if (entity.type === 'text_mention')
            return String(entity.user?.id) === me.id;

        if (entity.type !== 'mention' && entity.type !== 'bot_command')
            return false;

        const handle = body.slice(entity.offset, entity.offset + entity.length).split('@').pop()?.toLowerCase();

        return username !== null && handle === username;
    });
};
