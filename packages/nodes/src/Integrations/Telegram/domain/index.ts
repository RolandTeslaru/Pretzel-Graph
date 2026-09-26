import { z } from 'zod';
import { Gateway } from '@pretzel-graph/shared/domain';

// The Telegram updates a workflow can listen to; `type` is Telegram's own update name.
export namespace Telegram {

    // Named once here; the connection definition declares the same word.
    export const PROVIDER = 'telegram';

    export interface ScopeParts {
        chatId?:  string
        topicId?: string
        userId?:  string
    }

    // Fingerprints a Telegram conversation; each part left out widens it.
    export const createScope = (botId: string, parts: ScopeParts = {}) =>
        Gateway.Socket.createScope(
            PROVIDER,
            botId,
            ...(parts.chatId ? ['chat', parts.chatId] : []),
            ...(parts.topicId ? ['topic', parts.topicId] : []),
            ...(parts.userId ? ['user', parts.userId] : []),
        );

    // Telegram dates are epoch seconds.
    export const unixToISO = (seconds: number | null | undefined) =>
        seconds ? new Date(seconds * 1000).toISOString() : null;

    export const ChatType = z.enum(['private', 'group', 'supergroup', 'channel']);
    export type ChatType = z.infer<typeof ChatType>;

    export const User = z.object({
        id:       z.string(),
        name:     z.string(),
        username: z.string().nullable(),
        bot:      z.boolean(),
    });
    export type User = z.infer<typeof User>;

    // Files travel as ids; the node downloads them, so no token-bearing URL ever reaches a workflow.
    export const File = z.object({
        kind:     z.string(),
        fileId:   z.string(),
        fileName: z.string().nullable(),
        mimeType: z.string().nullable(),
        size:     z.number().nullable(),
    });
    export type File = z.infer<typeof File>;

    export namespace Event {

        const Base = Gateway.Socket.Event.extend({
            updateId:      z.number(),
            directMessage: z.boolean().optional(),
            mentionsMe:    z.boolean().optional(),
        });

        const MessageShape = {
            messageId:        z.number(),
            chatId:           z.string(),
            chatType:         ChatType,
            chatTitle:        z.string().nullable(),
            topicId:          z.string().nullable(),
            from:             User.nullable(),
            text:             z.string(),
            command:          z.string().nullable(),
            commandArgs:      z.string().nullable(),
            replyToMessageId: z.number().nullable(),
            files:            z.array(File),
            createdAt:        z.string().nullable(),
        };


        export namespace Message {
            export const Create = Base.extend({ type: z.literal('message'), ...MessageShape });
            export type Create = z.infer<typeof Create>;

            export const Edit = Base.extend({
                type:     z.literal('edited_message'),
                ...MessageShape,
                editedAt: z.string().nullable(),
            });
            export type Edit = z.infer<typeof Edit>;
        }


        export namespace ChannelPost {
            export const Create = Base.extend({ type: z.literal('channel_post'), ...MessageShape });
            export type Create = z.infer<typeof Create>;

            export const Edit = Base.extend({
                type:     z.literal('edited_channel_post'),
                ...MessageShape,
                editedAt: z.string().nullable(),
            });
            export type Edit = z.infer<typeof Edit>;
        }


        // A press on an inline button; the button keeps spinning until the workflow answers it.
        export namespace CallbackQuery {
            export const Create = Base.extend({
                type:            z.literal('callback_query'),
                queryId:         z.string(),
                from:            User,
                chatId:          z.string().nullable(),
                chatType:        ChatType.nullable(),
                topicId:         z.string().nullable(),
                messageId:       z.number().nullable(),
                inlineMessageId: z.string().nullable(),
                data:            z.string().nullable(),
            });
            export type Create = z.infer<typeof Create>;
        }


        export namespace Reaction {
            export const Update = Base.extend({
                type:      z.literal('message_reaction'),
                chatId:    z.string(),
                chatType:  ChatType,
                messageId: z.number(),
                user:      User.nullable(),
                added:     z.array(z.string()),
                removed:   z.array(z.string()),
            });
            export type Update = z.infer<typeof Update>;
        }


        export namespace Member {
            const Shape = {
                chatId:    z.string(),
                chatType:  ChatType,
                chatTitle: z.string().nullable(),
                from:      User,
                member:    User,
                status:    z.string(),
                oldStatus: z.string(),
            };

            // The bot itself being added, removed, promoted, or blocked in a private chat.
            export const Bot = Base.extend({ type: z.literal('my_chat_member'), ...Shape });
            export type Bot = z.infer<typeof Bot>;

            export const Other = Base.extend({ type: z.literal('chat_member'), ...Shape });
            export type Other = z.infer<typeof Other>;

            export const JoinRequest = Base.extend({
                type:       z.literal('chat_join_request'),
                chatId:     z.string(),
                chatType:   ChatType,
                chatTitle:  z.string().nullable(),
                from:       User,
                bio:        z.string().nullable(),
                inviteLink: z.string().nullable(),
            });
            export type JoinRequest = z.infer<typeof JoinRequest>;
        }


        export namespace Poll {
            export const Answer = Base.extend({
                type:      z.literal('poll_answer'),
                pollId:    z.string(),
                user:      User.nullable(),
                optionIds: z.array(z.number()),
            });
            export type Answer = z.infer<typeof Answer>;
        }


        export const Schema = z.discriminatedUnion('type', [
            Message.Create,
            Message.Edit,
            ChannelPost.Create,
            ChannelPost.Edit,
            CallbackQuery.Create,
            Reaction.Update,
            Member.Bot,
            Member.Other,
            Member.JoinRequest,
            Poll.Answer,
        ]);
    }

    export type Event = z.infer<typeof Event.Schema>;

    // Every update type the socket asks for; reactions and member changes only arrive when named.
    export const ALLOWED_UPDATES = [
        'message',
        'edited_message',
        'channel_post',
        'edited_channel_post',
        'callback_query',
        'message_reaction',
        'my_chat_member',
        'chat_member',
        'chat_join_request',
        'poll_answer',
    ] as const;
}
