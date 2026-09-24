import { z } from 'zod';
import { Gateway } from '@pretzel-graph/shared/domain';

// The Slack events a workflow can listen to; edits and deletions get their own type instead of a subtype.
export namespace Slack {

    // Named once here; the connection definition declares the same word.
    export const PROVIDER = 'slack';

    export interface ScopeParts {
        channelId?: string
        threadTs?:  string
        userId?:    string
    }

    // Fingerprints a Slack conversation; each part left out widens it.
    export const createScope = (connectionId: Gateway.Connection.Id, parts: ScopeParts = {}) =>
        Gateway.Socket.createScope(
            PROVIDER,
            connectionId,
            ...(parts.channelId ? ['channel', parts.channelId] : []),
            ...(parts.threadTs ? ['thread', parts.threadTs] : []),
            ...(parts.userId ? ['user', parts.userId] : []),
        );

    // Slack timestamps are epoch seconds with a sequence suffix, and double as message ids.
    export const tsToISO = (ts: string | null | undefined) =>
        ts ? new Date(Number.parseFloat(ts) * 1000).toISOString() : null;

    export namespace Event {

        const Base = Gateway.Socket.Event.extend({
            teamId:        z.string().nullable(),
            directMessage: z.boolean().optional(),
            mentionsMe:    z.boolean().optional(),
        });

        const File = z.object({
            name: z.string().nullable(),
            url:  z.string().nullable(),
        });


        export namespace Message {
            export const Create = Base.extend({
                type:        z.literal('message'),
                messageTs:   z.string(),
                channelId:   z.string(),
                channelType: z.string().nullable(),
                threadTs:    z.string().nullable(),
                userId:      z.string().nullable(),
                botId:       z.string().nullable(),
                subtype:     z.string().nullable(),
                text:        z.string(),
                files:       z.array(File),
                createdAt:   z.string().nullable(),
            });
            export type Create = z.infer<typeof Create>;

            export const Update = Base.extend({
                type:        z.literal('message_changed'),
                messageTs:   z.string(),
                channelId:   z.string(),
                channelType: z.string().nullable(),
                threadTs:    z.string().nullable(),
                userId:      z.string().nullable(),
                botId:       z.string().nullable(),
                text:        z.string().nullable(),
                oldText:     z.string().nullable(),
                editedAt:    z.string().nullable(),
            });
            export type Update = z.infer<typeof Update>;

            export const Delete = Base.extend({
                type:        z.literal('message_deleted'),
                messageTs:   z.string(),
                channelId:   z.string(),
                channelType: z.string().nullable(),
                threadTs:    z.string().nullable(),
                userId:      z.string().nullable(),
                botId:       z.string().nullable(),
                text:        z.string().nullable(),
            });
            export type Delete = z.infer<typeof Delete>;
        }


        export namespace AppMention {
            export const Create = Base.extend({
                type:      z.literal('app_mention'),
                messageTs: z.string(),
                channelId: z.string(),
                threadTs:  z.string().nullable(),
                userId:    z.string().nullable(),
                text:      z.string(),
                files:     z.array(File),
                createdAt: z.string().nullable(),
            });
            export type Create = z.infer<typeof Create>;
        }


        export namespace Reaction {
            const Shape = {
                reaction:   z.string(),
                userId:     z.string(),
                itemUserId: z.string().nullable(),
                channelId:  z.string().nullable(),
                messageTs:  z.string().nullable(),
            };

            export const Add = Base.extend({ type: z.literal('reaction_added'), ...Shape });
            export type Add = z.infer<typeof Add>;

            export const Remove = Base.extend({ type: z.literal('reaction_removed'), ...Shape });
            export type Remove = z.infer<typeof Remove>;
        }


        export namespace Member {
            export const JoinedChannel = Base.extend({
                type:        z.literal('member_joined_channel'),
                channelId:   z.string(),
                channelType: z.string().nullable(),
                userId:      z.string(),
                inviterId:   z.string().nullable(),
            });
            export type JoinedChannel = z.infer<typeof JoinedChannel>;

            export const LeftChannel = Base.extend({
                type:        z.literal('member_left_channel'),
                channelId:   z.string(),
                channelType: z.string().nullable(),
                userId:      z.string(),
            });
            export type LeftChannel = z.infer<typeof LeftChannel>;

            export const TeamJoin = Base.extend({
                type:   z.literal('team_join'),
                userId: z.string(),
                name:   z.string().nullable(),
                bot:    z.boolean(),
            });
            export type TeamJoin = z.infer<typeof TeamJoin>;
        }


        export namespace Channel {
            export const Create = Base.extend({
                type:      z.literal('channel_created'),
                channelId: z.string(),
                name:      z.string().nullable(),
                creatorId: z.string().nullable(),
            });
            export type Create = z.infer<typeof Create>;

            export const Delete = Base.extend({
                type:      z.literal('channel_deleted'),
                channelId: z.string(),
            });
            export type Delete = z.infer<typeof Delete>;

            export const Rename = Base.extend({
                type:      z.literal('channel_rename'),
                channelId: z.string(),
                name:      z.string().nullable(),
            });
            export type Rename = z.infer<typeof Rename>;

            export const Archive = Base.extend({
                type:      z.literal('channel_archive'),
                channelId: z.string(),
                userId:    z.string().nullable(),
            });
            export type Archive = z.infer<typeof Archive>;

            export const Unarchive = Base.extend({
                type:      z.literal('channel_unarchive'),
                channelId: z.string(),
                userId:    z.string().nullable(),
            });
            export type Unarchive = z.infer<typeof Unarchive>;
        }


        export namespace Pin {
            const Shape = {
                channelId: z.string(),
                userId:    z.string().nullable(),
                messageTs: z.string().nullable(),
            };

            export const Add = Base.extend({ type: z.literal('pin_added'), ...Shape });
            export type Add = z.infer<typeof Add>;

            export const Remove = Base.extend({ type: z.literal('pin_removed'), ...Shape });
            export type Remove = z.infer<typeof Remove>;
        }


        export namespace AppHome {
            export const Opened = Base.extend({
                type:      z.literal('app_home_opened'),
                userId:    z.string(),
                channelId: z.string().nullable(),
                tab:       z.string().nullable(),
            });
            export type Opened = z.infer<typeof Opened>;
        }


        export namespace Command {
            export const Slash = Base.extend({
                type:        z.literal('slash_command'),
                command:     z.string(),
                text:        z.string(),
                userId:      z.string(),
                userName:    z.string().nullable(),
                channelId:   z.string().nullable(),
                channelName: z.string().nullable(),
                triggerId:   z.string().nullable(),
                responseUrl: z.string().nullable(),
            });
            export type Slash = z.infer<typeof Slash>;
        }


        export namespace Interaction {
            const Action = z.object({
                actionId: z.string(),
                blockId:  z.string().nullable(),
                value:    z.string().nullable(),
            });

            export const BlockActions = Base.extend({
                type:        z.literal('block_actions'),
                userId:      z.string(),
                channelId:   z.string().nullable(),
                messageTs:   z.string().nullable(),
                threadTs:    z.string().nullable(),
                triggerId:   z.string().nullable(),
                responseUrl: z.string().nullable(),
                actions:     z.array(Action),
            });
            export type BlockActions = z.infer<typeof BlockActions>;

            export const ViewSubmission = Base.extend({
                type:       z.literal('view_submission'),
                userId:     z.string(),
                viewId:     z.string(),
                callbackId: z.string().nullable(),
                values:     z.json(),
                triggerId:  z.string().nullable(),
            });
            export type ViewSubmission = z.infer<typeof ViewSubmission>;

            // Global shortcuts have no channel or message; message shortcuts carry both.
            export const Shortcut = Base.extend({
                type:        z.literal('shortcut'),
                callbackId:  z.string(),
                userId:      z.string(),
                channelId:   z.string().nullable(),
                messageTs:   z.string().nullable(),
                messageText: z.string().nullable(),
                triggerId:   z.string().nullable(),
                responseUrl: z.string().nullable(),
            });
            export type Shortcut = z.infer<typeof Shortcut>;
        }


        export const Schema = z.discriminatedUnion('type', [
            Message.Create,
            Message.Update,
            Message.Delete,
            AppMention.Create,
            Reaction.Add,
            Reaction.Remove,
            Member.JoinedChannel,
            Member.LeftChannel,
            Member.TeamJoin,
            Channel.Create,
            Channel.Delete,
            Channel.Rename,
            Channel.Archive,
            Channel.Unarchive,
            Pin.Add,
            Pin.Remove,
            AppHome.Opened,
            Command.Slash,
            Interaction.BlockActions,
            Interaction.ViewSubmission,
            Interaction.Shortcut,
        ]);
    }

    export type Event = z.infer<typeof Event.Schema>;
}
