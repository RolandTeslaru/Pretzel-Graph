import type { ClientEvents } from 'discord.js';
import type { z } from 'zod';

import { Discord } from '../../Integrations/Discord/domain';

type Body<T_Schema extends z.ZodType> = Omit<z.infer<T_Schema>, 'type' | 'directMessage' | 'mentionsMe'>;

type Args<T extends keyof ClientEvents> = ClientEvents[T];

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

const author = (value: { id: string; username: string; globalName?: string | null; bot: boolean }) => ({
    id:   value.id,
    name: value.globalName ?? value.username,
    bot:  value.bot,
});

// A channel is a DM, a guild channel or a thread, and only some of those carry a name or a parent.
const channel = (value: Args<'channelCreate'>[0] | Args<'threadCreate'>[0]) => ({
    channelId:   value.id,
    guildId:     'guildId' in value ? value.guildId ?? null : null,
    name:        'name' in value ? value.name ?? null : null,
    channelType: value.type as number,
    parentId:    'parentId' in value ? value.parentId ?? null : null,
});

const scheduledEvent = (value: Args<'guildScheduledEventCreate'>[0]) => ({
    scheduledEventId: value.id,
    guildId:          value.guildId,
    name:             value.name,
    description:      value.description ?? null,
    channelId:        value.channelId ?? null,
    startsAt:         iso(value.scheduledStartAt),
    status:           (value.status as number | null) ?? null,
});

const invite = (value: Args<'inviteCreate'>[0]) => ({
    code:      value.code,
    channelId: value.channel?.id ?? null,
    guildId:   value.guild?.id ?? null,
    inviterId: value.inviterId ?? null,
});


/**
 * One mapper per event, turning discord.js's arguments into that event's schema.
 *
 * Shaped exactly like `Discord.Event`, so the socket can pair the two and read each event's name
 * off its schema. Each mapper is annotated with the schema it fills, so a field the schema declares
 * and the mapper forgets is a compile error. `type` and the two socket flags are added by the
 * socket itself.
 */
export const Mapper = {

    messageCreate: (message: Args<'messageCreate'>[0]): Body<typeof Discord.Event.Message.Create> => ({
        messageId:   message.id,
        channelId:   message.channelId,
        guildId:     message.guildId ?? null,
        author:      author(message.author),
        content:     message.content,
        replyToId:   message.reference?.messageId ?? null,
        attachments: message.attachments.map(file => ({ name: file.name, url: file.url })),
        createdAt:   message.createdAt.toISOString(),
    }),

    messageUpdate: (
        before: Args<'messageUpdate'>[0],
        after:  Args<'messageUpdate'>[1],
    ): Body<typeof Discord.Event.Message.Update> => ({
        messageId:  after.id,
        channelId:  after.channelId,
        guildId:    after.guildId ?? null,
        author:     after.author ? author(after.author) : null,
        content:    after.content ?? null,
        oldContent: before.content ?? null,
        editedAt:   iso(after.editedAt),
    }),

    messageDelete: (message: Args<'messageDelete'>[0]): Body<typeof Discord.Event.Message.Delete> => ({
        messageId: message.id,
        channelId: message.channelId,
        guildId:   message.guildId ?? null,
        author:    message.author ? author(message.author) : null,
        content:   message.content ?? null,
    }),

    messageReactionAdd: (
        reaction: Args<'messageReactionAdd'>[0],
        reactor:  Args<'messageReactionAdd'>[1],
    ): Body<typeof Discord.Event.Reaction.Add> => ({
        messageId: reaction.message.id,
        channelId: reaction.message.channelId,
        emoji:     reaction.emoji.name,
        emojiId:   reaction.emoji.id,
        userId:    reactor.id,
        count:     reaction.count ?? null,
    }),

    messageReactionRemove: (
        reaction: Args<'messageReactionRemove'>[0],
        reactor:  Args<'messageReactionRemove'>[1],
    ): Body<typeof Discord.Event.Reaction.Remove> => ({
        messageId: reaction.message.id,
        channelId: reaction.message.channelId,
        emoji:     reaction.emoji.name,
        emojiId:   reaction.emoji.id,
        userId:    reactor.id,
        count:     reaction.count ?? null,
    }),

    typingStart: (typing: Args<'typingStart'>[0]): Body<typeof Discord.Event.Typing.Start> => ({
        channelId: typing.channel.id,
        guildId:   typing.guild?.id ?? null,
        userId:    typing.user.id,
        startedAt: typing.startedAt.toISOString(),
    }),

    guildMemberAdd: (member: Args<'guildMemberAdd'>[0]): Body<typeof Discord.Event.Member.Add> => ({
        guildId:  member.guild.id,
        user:     author(member.user),
        nickname: member.nickname ?? null,
        joinedAt: iso(member.joinedAt),
    }),

    guildMemberRemove: (member: Args<'guildMemberRemove'>[0]): Body<typeof Discord.Event.Member.Remove> => ({
        guildId: member.guild.id,
        user:    member.user ? author(member.user) : null,
    }),

    guildMemberUpdate: (
        before: Args<'guildMemberUpdate'>[0],
        after:  Args<'guildMemberUpdate'>[1],
    ): Body<typeof Discord.Event.Member.Update> => ({
        guildId:     after.guild.id,
        user:        after.user ? author(after.user) : null,
        nickname:    after.nickname ?? null,
        oldNickname: before.nickname ?? null,
        roleIds:     [...after.roles.cache.keys()],
        oldRoleIds:  [...before.roles.cache.keys()],
    }),

    channelCreate: (created: Args<'channelCreate'>[0]): Body<typeof Discord.Event.Channel.Create> =>
        channel(created),

    channelDelete: (deleted: Args<'channelDelete'>[0]): Body<typeof Discord.Event.Channel.Delete> =>
        channel(deleted as Args<'channelCreate'>[0]),

    channelUpdate: (
        before: Args<'channelUpdate'>[0],
        after:  Args<'channelUpdate'>[1],
    ): Body<typeof Discord.Event.Channel.Update> => ({
        ...channel(after as Args<'channelCreate'>[0]),
        oldName: 'name' in before ? before.name ?? null : null,
    }),

    threadCreate: (thread: Args<'threadCreate'>[0]): Body<typeof Discord.Event.Thread.Create> =>
        channel(thread),

    threadDelete: (thread: Args<'threadDelete'>[0]): Body<typeof Discord.Event.Thread.Delete> =>
        channel(thread),

    voiceStateUpdate: (
        before: Args<'voiceStateUpdate'>[0],
        after:  Args<'voiceStateUpdate'>[1],
    ): Body<typeof Discord.Event.Voice.StateUpdate> => ({
        guildId:      after.guild.id,
        userId:       after.id ?? null,
        channelId:    after.channelId ?? null,
        oldChannelId: before.channelId ?? null,
        selfMute:     after.selfMute ?? null,
        selfDeaf:     after.selfDeaf ?? null,
    }),

    presenceUpdate: (
        before: Args<'presenceUpdate'>[0],
        after:  Args<'presenceUpdate'>[1],
    ): Body<typeof Discord.Event.Presence.Update> => ({
        guildId:   after.guild?.id ?? null,
        userId:    after.userId ?? null,
        status:    after.status ?? null,
        oldStatus: before?.status ?? null,
    }),

    guildBanAdd: (ban: Args<'guildBanAdd'>[0]): Body<typeof Discord.Event.Ban.Add> => ({
        guildId: ban.guild.id,
        user:    author(ban.user),
        reason:  ban.reason ?? null,
    }),

    guildBanRemove: (ban: Args<'guildBanRemove'>[0]): Body<typeof Discord.Event.Ban.Remove> => ({
        guildId: ban.guild.id,
        user:    author(ban.user),
        reason:  ban.reason ?? null,
    }),

    autoModerationActionExecution: (
        execution: Args<'autoModerationActionExecution'>[0],
    ): Body<typeof Discord.Event.AutoModeration.ActionExecution> => ({
        guildId:     execution.guild.id,
        channelId:   execution.channelId ?? null,
        userId:      execution.userId,
        ruleId:      execution.ruleId,
        content:     execution.content ?? null,
        matchedWord: execution.matchedKeyword ?? null,
    }),

    inviteCreate: (created: Args<'inviteCreate'>[0]): Body<typeof Discord.Event.Invite.Create> => ({
        ...invite(created),
        maxUses:   created.maxUses ?? null,
        expiresAt: iso(created.expiresAt),
    }),

    inviteDelete: (deleted: Args<'inviteDelete'>[0]): Body<typeof Discord.Event.Invite.Delete> =>
        invite(deleted),

    guildScheduledEventCreate: (
        created: Args<'guildScheduledEventCreate'>[0],
    ): Body<typeof Discord.Event.ScheduledEvent.Create> => scheduledEvent(created),

    guildScheduledEventDelete: (
        deleted: Args<'guildScheduledEventDelete'>[0],
    ): Body<typeof Discord.Event.ScheduledEvent.Delete> => ({
        scheduledEventId: deleted.id,
        guildId:          deleted.guildId,
        name:             deleted.name ?? null,
        description:      deleted.description ?? null,
        channelId:        deleted.channelId ?? null,
        startsAt:         iso(deleted.scheduledStartAt),
        status:           (deleted.status as number | null) ?? null,
    }),

    guildScheduledEventUpdate: (
        before: Args<'guildScheduledEventUpdate'>[0],
        after:  Args<'guildScheduledEventUpdate'>[1],
    ): Body<typeof Discord.Event.ScheduledEvent.Update> => ({
        ...scheduledEvent(after),
        oldStatus: (before?.status as number | null) ?? null,
    }),

    interactionCreate: (
        interaction: Args<'interactionCreate'>[0],
    ): Body<typeof Discord.Event.Interaction.Create> => ({
        interactionId:   interaction.id,
        interactionKind: interaction.type as number,
        channelId:       interaction.channelId ?? null,
        guildId:         interaction.guildId ?? null,
        userId:          interaction.user.id,
        commandName:     'commandName' in interaction ? interaction.commandName : null,
        customId:        'customId' in interaction ? interaction.customId : null,
    }),


} satisfies Partial<{ [T in keyof ClientEvents]: (...args: ClientEvents[T]) => object }>;
