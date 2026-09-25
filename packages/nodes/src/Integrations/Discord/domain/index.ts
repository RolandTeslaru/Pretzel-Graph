import { z } from 'zod';
import { Gateway } from '@pretzel-graph/shared/domain';

/**
 * The Discord events a workflow can listen to, one schema each.
 *
 * `type` is discord.js's own event name. `directMessage` and `mentionsMe` are on the base because
 * only the socket can answer them: both depend on which bot this connection is.
 */
export namespace Discord {

    // Named once here; the connection definition declares the same word.
    export const PROVIDER = 'discord';

    /**
     * Fingerprints a Discord conversation, narrowing by whichever parts are given.
     *
     * Leave a part out and it drops from the key: no channel and no user is the whole bot,
     * a channel alone is everyone in it, a channel with a user is that person in that channel.
     */
    export const createScope = (
        botId:      string,
        channelId?: string,
        userId?:    string,
    ) => Gateway.Socket.createScope(
        PROVIDER,
        botId,
        ...(channelId ? ['channel', channelId] : []),
        ...(userId ? ['user', userId] : []),
    );

    export namespace Event {

        const Base = Gateway.Socket.Event.extend({
            directMessage: z.boolean().optional(),
            mentionsMe:    z.boolean().optional(),
        });

        const Author = z.object({
            id:   z.string(),
            name: z.string(),
            bot:  z.boolean(),
        });

        const Attachment = z.object({
            name: z.string(),
            url:  z.string(),
        });


        export namespace Message {
            export const Create = Base.extend({
                type:        z.literal('messageCreate'),
                messageId:   z.string(),
                channelId:   z.string(),
                guildId:     z.string().nullable(),
                author:      Author,
                content:     z.string(),
                replyToId:   z.string().nullable(),
                attachments: z.array(Attachment),
                createdAt:   z.string(),
            });
            export type Create = z.infer<typeof Create>;

            export const Update = Base.extend({
                type:       z.literal('messageUpdate'),
                messageId:  z.string(),
                channelId:  z.string(),
                guildId:    z.string().nullable(),
                author:     Author.nullable(),
                content:    z.string().nullable(),
                oldContent: z.string().nullable(),
                editedAt:   z.string().nullable(),
            });
            export type Update = z.infer<typeof Update>;

            export const Delete = Base.extend({
                type:      z.literal('messageDelete'),
                messageId: z.string(),
                channelId: z.string(),
                guildId:   z.string().nullable(),
                author:    Author.nullable(),
                content:   z.string().nullable(),
            });
            export type Delete = z.infer<typeof Delete>;
        }


        export namespace Reaction {
            const Shape = {
                messageId: z.string(),
                channelId: z.string(),
                emoji:     z.string().nullable(),
                emojiId:   z.string().nullable(),
                userId:    z.string(),
                count:     z.number().nullable(),
            };

            export const Add = Base.extend({ type: z.literal('messageReactionAdd'), ...Shape });
            export type Add = z.infer<typeof Add>;

            export const Remove = Base.extend({ type: z.literal('messageReactionRemove'), ...Shape });
            export type Remove = z.infer<typeof Remove>;
        }


        export namespace Typing {
            export const Start = Base.extend({
                type:      z.literal('typingStart'),
                channelId: z.string(),
                guildId:   z.string().nullable(),
                userId:    z.string(),
                startedAt: z.string(),
            });
            export type Start = z.infer<typeof Start>;
        }


        export namespace Member {
            export const Add = Base.extend({
                type:     z.literal('guildMemberAdd'),
                guildId:  z.string(),
                user:     Author,
                nickname: z.string().nullable(),
                joinedAt: z.string().nullable(),
            });
            export type Add = z.infer<typeof Add>;

            export const Remove = Base.extend({
                type:    z.literal('guildMemberRemove'),
                guildId: z.string(),
                user:    Author.nullable(),
            });
            export type Remove = z.infer<typeof Remove>;

            export const Update = Base.extend({
                type:        z.literal('guildMemberUpdate'),
                guildId:     z.string(),
                user:        Author.nullable(),
                nickname:    z.string().nullable(),
                oldNickname: z.string().nullable(),
                roleIds:     z.array(z.string()),
                oldRoleIds:  z.array(z.string()),
            });
            export type Update = z.infer<typeof Update>;
        }


        const ChannelShape = {
            channelId:   z.string(),
            guildId:     z.string().nullable(),
            name:        z.string().nullable(),
            channelType: z.number(),
            parentId:    z.string().nullable(),
        };

        export namespace Channel {
            export const Create = Base.extend({ type: z.literal('channelCreate'), ...ChannelShape });
            export type Create = z.infer<typeof Create>;

            export const Delete = Base.extend({ type: z.literal('channelDelete'), ...ChannelShape });
            export type Delete = z.infer<typeof Delete>;

            export const Update = Base.extend({
                type:    z.literal('channelUpdate'),
                ...ChannelShape,
                oldName: z.string().nullable(),
            });
            export type Update = z.infer<typeof Update>;
        }


        export namespace Thread {
            export const Create = Base.extend({ type: z.literal('threadCreate'), ...ChannelShape });
            export type Create = z.infer<typeof Create>;

            export const Delete = Base.extend({ type: z.literal('threadDelete'), ...ChannelShape });
            export type Delete = z.infer<typeof Delete>;
        }


        export namespace Voice {
            export const StateUpdate = Base.extend({
                type:         z.literal('voiceStateUpdate'),
                guildId:      z.string(),
                userId:       z.string().nullable(),
                channelId:    z.string().nullable(),
                oldChannelId: z.string().nullable(),
                selfMute:     z.boolean().nullable(),
                selfDeaf:     z.boolean().nullable(),
            });
            export type StateUpdate = z.infer<typeof StateUpdate>;
        }


        export namespace Presence {
            export const Update = Base.extend({
                type:      z.literal('presenceUpdate'),
                guildId:   z.string().nullable(),
                userId:    z.string().nullable(),
                status:    z.string().nullable(),
                oldStatus: z.string().nullable(),
            });
            export type Update = z.infer<typeof Update>;
        }


        export namespace Ban {
            const Shape = {
                guildId: z.string(),
                user:    Author,
                reason:  z.string().nullable(),
            };

            export const Add = Base.extend({ type: z.literal('guildBanAdd'), ...Shape });
            export type Add = z.infer<typeof Add>;

            export const Remove = Base.extend({ type: z.literal('guildBanRemove'), ...Shape });
            export type Remove = z.infer<typeof Remove>;
        }


        export namespace AutoModeration {
            export const ActionExecution = Base.extend({
                type:        z.literal('autoModerationActionExecution'),
                guildId:     z.string(),
                channelId:   z.string().nullable(),
                userId:      z.string(),
                ruleId:      z.string(),
                content:     z.string().nullable(),
                matchedWord: z.string().nullable(),
            });
            export type ActionExecution = z.infer<typeof ActionExecution>;
        }


        export namespace Invite {
            const Shape = {
                code:      z.string(),
                channelId: z.string().nullable(),
                guildId:   z.string().nullable(),
                inviterId: z.string().nullable(),
            };

            export const Create = Base.extend({
                type: z.literal('inviteCreate'),
                ...Shape,
                maxUses:   z.number().nullable(),
                expiresAt: z.string().nullable(),
            });
            export type Create = z.infer<typeof Create>;

            export const Delete = Base.extend({ type: z.literal('inviteDelete'), ...Shape });
            export type Delete = z.infer<typeof Delete>;
        }


        export namespace ScheduledEvent {
            const Shape = {
                scheduledEventId: z.string(),
                guildId:          z.string(),
                name:             z.string(),
                description:      z.string().nullable(),
                channelId:        z.string().nullable(),
                startsAt:         z.string().nullable(),
                status:           z.number().nullable(),
            };

            export const Create = Base.extend({ type: z.literal('guildScheduledEventCreate'), ...Shape });
            export type Create = z.infer<typeof Create>;

            export const Delete = Base.extend({
                type: z.literal('guildScheduledEventDelete'),
                ...Shape,
                name: z.string().nullable(),
            });
            export type Delete = z.infer<typeof Delete>;

            export const Update = Base.extend({
                type: z.literal('guildScheduledEventUpdate'),
                ...Shape,
                oldStatus: z.number().nullable(),
            });
            export type Update = z.infer<typeof Update>;
        }


        export namespace Interaction {
            export const Create = Base.extend({
                type:            z.literal('interactionCreate'),
                interactionId:   z.string(),
                interactionKind: z.number(),
                channelId:       z.string().nullable(),
                guildId:         z.string().nullable(),
                userId:          z.string(),
                commandName:     z.string().nullable(),
                customId:        z.string().nullable(),
            });
            export type Create = z.infer<typeof Create>;
        }


        export const Schema = z.discriminatedUnion('type', [
            Message.Create,
            Message.Update,
            Message.Delete,
            Reaction.Add,
            Reaction.Remove,
            Typing.Start,
            Member.Add,
            Member.Remove,
            Member.Update,
            Channel.Create,
            Channel.Delete,
            Channel.Update,
            Thread.Create,
            Thread.Delete,
            Voice.StateUpdate,
            Presence.Update,
            Ban.Add,
            Ban.Remove,
            AutoModeration.ActionExecution,
            Invite.Create,
            Invite.Delete,
            ScheduledEvent.Create,
            ScheduledEvent.Update,
            ScheduledEvent.Delete,
            Interaction.Create,
        ]);
    }

    export type Event = z.infer<typeof Event.Schema>;
}
