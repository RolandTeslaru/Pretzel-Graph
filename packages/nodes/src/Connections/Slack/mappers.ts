import type { z } from 'zod';

import { Slack } from '../../Integrations/Slack/domain';

type Body<T_Schema extends z.ZodType> = Omit<z.infer<T_Schema>, 'type' | 'teamId' | 'directMessage' | 'mentionsMe'>;

// Slack payloads are loosely typed JSON; every read goes through these so a missing key is null.
type Raw = Record<string, any>;

const text = (value: unknown) => typeof value === 'string' ? value : null;

const files = (value: unknown) => Array.isArray(value)
    ? value.map((file: Raw) => ({ name: text(file.name), url: text(file.url_private) }))
    : [];

// Message subtypes that are a person or app saying something; the rest are channel housekeeping.
const SPOKEN_SUBTYPES = new Set(['file_share', 'thread_broadcast', 'bot_message', 'me_message']);


// One mapper per event type, each annotated with the schema it fills; `null` drops the event.
export const EventMapper = {

    message: (event: Raw): Body<typeof Slack.Event.Message.Create> | null => {
        if (event.subtype && !SPOKEN_SUBTYPES.has(event.subtype))
            return null;

        return {
            messageTs:   event.ts,
            channelId:   event.channel,
            channelType: text(event.channel_type),
            threadTs:    text(event.thread_ts),
            userId:      text(event.user),
            botId:       text(event.bot_id),
            subtype:     text(event.subtype),
            text:        event.text ?? '',
            files:       files(event.files),
            createdAt:   Slack.tsToISO(event.ts),
        };
    },

    message_changed: (event: Raw): Body<typeof Slack.Event.Message.Update> => ({
        messageTs:   event.message?.ts ?? event.ts,
        channelId:   event.channel,
        channelType: text(event.channel_type),
        threadTs:    text(event.message?.thread_ts),
        userId:      text(event.message?.user),
        botId:       text(event.message?.bot_id),
        text:        text(event.message?.text),
        oldText:     text(event.previous_message?.text),
        editedAt:    Slack.tsToISO(event.message?.edited?.ts),
    }),

    message_deleted: (event: Raw): Body<typeof Slack.Event.Message.Delete> => ({
        messageTs:   event.deleted_ts ?? event.previous_message?.ts,
        channelId:   event.channel,
        channelType: text(event.channel_type),
        threadTs:    text(event.previous_message?.thread_ts),
        userId:      text(event.previous_message?.user),
        botId:       text(event.previous_message?.bot_id),
        text:        text(event.previous_message?.text),
    }),

    app_mention: (event: Raw): Body<typeof Slack.Event.AppMention.Create> => ({
        messageTs: event.ts,
        channelId: event.channel,
        threadTs:  text(event.thread_ts),
        userId:    text(event.user),
        text:      event.text ?? '',
        files:     files(event.files),
        createdAt: Slack.tsToISO(event.ts),
    }),

    reaction_added: (event: Raw): Body<typeof Slack.Event.Reaction.Add> => reaction(event),

    reaction_removed: (event: Raw): Body<typeof Slack.Event.Reaction.Remove> => reaction(event),

    member_joined_channel: (event: Raw): Body<typeof Slack.Event.Member.JoinedChannel> => ({
        channelId:   event.channel,
        channelType: text(event.channel_type),
        userId:      event.user,
        inviterId:   text(event.inviter),
    }),

    member_left_channel: (event: Raw): Body<typeof Slack.Event.Member.LeftChannel> => ({
        channelId:   event.channel,
        channelType: text(event.channel_type),
        userId:      event.user,
    }),

    team_join: (event: Raw): Body<typeof Slack.Event.Member.TeamJoin> => ({
        userId: event.user?.id,
        name:   text(event.user?.real_name) ?? text(event.user?.name),
        bot:    Boolean(event.user?.is_bot),
    }),

    channel_created: (event: Raw): Body<typeof Slack.Event.Channel.Create> => ({
        channelId: event.channel?.id,
        name:      text(event.channel?.name),
        creatorId: text(event.channel?.creator),
    }),

    channel_deleted: (event: Raw): Body<typeof Slack.Event.Channel.Delete> => ({
        channelId: event.channel,
    }),

    channel_rename: (event: Raw): Body<typeof Slack.Event.Channel.Rename> => ({
        channelId: event.channel?.id,
        name:      text(event.channel?.name),
    }),

    channel_archive: (event: Raw): Body<typeof Slack.Event.Channel.Archive> => ({
        channelId: event.channel,
        userId:    text(event.user),
    }),

    channel_unarchive: (event: Raw): Body<typeof Slack.Event.Channel.Unarchive> => ({
        channelId: event.channel,
        userId:    text(event.user),
    }),

    pin_added: (event: Raw): Body<typeof Slack.Event.Pin.Add> => pin(event),

    pin_removed: (event: Raw): Body<typeof Slack.Event.Pin.Remove> => pin(event),

    app_home_opened: (event: Raw): Body<typeof Slack.Event.AppHome.Opened> => ({
        userId:    event.user,
        channelId: text(event.channel),
        tab:       text(event.tab),
    }),
};


// Slash commands and interactions arrive as their own envelopes, not inside an Events API callback.
export const CommandMapper = {

    slash_command: (payload: Raw): Body<typeof Slack.Event.Command.Slash> => ({
        command:     payload.command,
        text:        payload.text ?? '',
        userId:      payload.user_id,
        userName:    text(payload.user_name),
        channelId:   text(payload.channel_id),
        channelName: text(payload.channel_name),
        triggerId:   text(payload.trigger_id),
        responseUrl: text(payload.response_url),
    }),

    block_actions: (payload: Raw): Body<typeof Slack.Event.Interaction.BlockActions> => ({
        userId:      payload.user?.id,
        channelId:   text(payload.channel?.id) ?? text(payload.container?.channel_id),
        messageTs:   text(payload.message?.ts) ?? text(payload.container?.message_ts),
        threadTs:    text(payload.message?.thread_ts) ?? text(payload.container?.thread_ts),
        triggerId:   text(payload.trigger_id),
        responseUrl: text(payload.response_url),
        actions:     (payload.actions ?? []).map((action: Raw) => ({
            actionId: action.action_id,
            blockId:  text(action.block_id),
            value:    text(action.value) ?? text(action.selected_option?.value),
        })),
    }),

    view_submission: (payload: Raw): Body<typeof Slack.Event.Interaction.ViewSubmission> => ({
        userId:     payload.user?.id,
        viewId:     payload.view?.id,
        callbackId: text(payload.view?.callback_id),
        values:     payload.view?.state?.values ?? {},
        triggerId:  text(payload.trigger_id),
    }),

    shortcut: (payload: Raw): Body<typeof Slack.Event.Interaction.Shortcut> => ({
        callbackId:  payload.callback_id,
        userId:      payload.user?.id,
        channelId:   text(payload.channel?.id),
        messageTs:   text(payload.message?.ts),
        messageText: text(payload.message?.text),
        triggerId:   text(payload.trigger_id),
        responseUrl: text(payload.response_url),
    }),
};


const reaction = (event: Raw) => ({
    reaction:   event.reaction,
    userId:     event.user,
    itemUserId: text(event.item_user),
    channelId:  text(event.item?.channel),
    messageTs:  text(event.item?.ts),
});

const pin = (event: Raw) => ({
    channelId: event.channel_id ?? event.item?.channel,
    userId:    text(event.user),
    messageTs: text(event.item?.message?.ts) ?? text(event.item?.ts),
});
