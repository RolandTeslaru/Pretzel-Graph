import { tool } from '@langchain/core/tools';
import { ToolBudget } from '@pretzel-graph/node-sdk';
import { z } from 'zod/v3';

import { SlackAPI, describeSlackError, type SlackChannel, type SlackMessage, type SlackUser } from '../client';
import { Slack } from '../domain';


const channelIdParam = z.string()
    .describe('Channel id, such as C0123ABCD (D… for a DM). A Slack event carries it as channelId; otherwise use slack_list_channels.');

const tsParam = z.string()
    .describe('Message timestamp, such as 1712345678.123456, which Slack uses as the message id. Take it from the `ts` of a fetched message or an event\'s messageTs.');

const userIdParam = z.string()
    .describe('User id, such as U0123ABCD. Take it from a message\'s `user`, or look it up with slack_find_user_by_email.');

const textParam = z.string().max(4000)
    .describe('Message text in Slack mrkdwn, not Markdown: *bold*, _italic_, `code`, <https://example.com|link text>, <@U0123ABCD> to mention someone.');

const cursorParam = z.string().optional()
    .describe('The next_cursor from a previous call, to fetch the next page.');


// A message as an agent needs it, which is far less than Slack sends; run mode keeps everything.
const listedMessage = (message: SlackMessage) => ({
    ts:          message.ts,
    user:        message.user ?? (message.bot_id ? `bot:${message.bot_id}` : undefined),
    text:        message.text || undefined,
    time:        Slack.tsToISO(message.ts) ?? undefined,
    thread_ts:   message.thread_ts && message.thread_ts !== message.ts ? message.thread_ts : undefined,
    replies:     message.reply_count || undefined,
    edited:      message.edited ? true : undefined,
    files:       message.files?.length ? message.files.map(file => file.name ?? file.id) : undefined,
    reactions:   message.reactions?.map(reaction => `${reaction.name}x${reaction.count}`),
});

const listedChannel = (channel: SlackChannel) => ({
    id:       channel.id,
    name:     channel.name,
    private:  channel.is_private || undefined,
    archived: channel.is_archived || undefined,
    member:   channel.is_member,
    members:  channel.num_members,
    topic:    channel.topic?.value || undefined,
    purpose:  channel.purpose?.value || undefined,
});

const listedUser = (user: SlackUser) => ({
    id:           user.id,
    name:         user.name,
    display_name: user.profile?.display_name || undefined,
    real_name:    user.real_name ?? user.profile?.real_name,
    title:        user.profile?.title || undefined,
    email:        user.profile?.email,
    bot:          user.is_bot || undefined,
    deleted:      user.deleted || undefined,
    tz:           user.tz,
});


export function buildTools(slack: SlackAPI) {

    // ─── Read ─────────────────────────────────────────────────────────────

    const fetchMessages = tool(
        async ({ channel_id, limit, oldest, latest, cursor }) => {
            try {
                const page = await slack.fetchMessages(channel_id, { limit, oldest, latest, cursor });

                return ToolBudget.value(
                    { messages: page.items.map(listedMessage), next_cursor: page.nextCursor ?? undefined },
                    { hint: 'Lower the limit, or narrow the window with oldest/latest.' },
                );
            }
            catch (error) {
                throw describeSlackError(error, 'fetching messages');
            }
        },
        {
            name:        'slack_fetch_messages',
            description: 'Read top-level messages from a Slack channel, newest first. Thread replies are not included; read those with slack_fetch_thread using a message\'s ts. The bot must be a member of the channel.',
            schema: z.object({
                channel_id: channelIdParam,
                limit:      z.number().int().min(1).max(200).default(50).describe('How many messages to return (1-200).'),
                oldest:     z.string().optional().describe('Only messages after this timestamp.'),
                latest:     z.string().optional().describe('Only messages before this timestamp.'),
                cursor:     cursorParam,
            }),
        },
    );


    const fetchThread = tool(
        async ({ channel_id, thread_ts, limit, cursor }) => {
            try {
                const page = await slack.fetchThread(channel_id, thread_ts, limit, cursor);

                return ToolBudget.value(
                    { messages: page.items.map(listedMessage), next_cursor: page.nextCursor ?? undefined },
                    { hint: 'Lower the limit.' },
                );
            }
            catch (error) {
                throw describeSlackError(error, 'fetching a thread');
            }
        },
        {
            name:        'slack_fetch_thread',
            description: 'Read a Slack thread, oldest first. The first message is the parent. Use it to catch up on a conversation before replying in it.',
            schema: z.object({
                channel_id: channelIdParam,
                thread_ts:  z.string().describe('The parent message\'s ts, or an event\'s threadTs.'),
                limit:      z.number().int().min(1).max(200).default(100).describe('How many messages to return (1-200).'),
                cursor:     cursorParam,
            }),
        },
    );


    const listPins = tool(
        async ({ channel_id }) => {
            try {
                const messages = await slack.listPins(channel_id);

                return ToolBudget.list('pinned', messages.map(listedMessage));
            }
            catch (error) {
                throw describeSlackError(error, 'listing pins');
            }
        },
        {
            name:        'slack_list_pins',
            description: 'List the pinned messages in a Slack channel. Pins are what a channel treats as important, so this is a cheap way to get its standing context.',
            schema:      z.object({ channel_id: channelIdParam }),
        },
    );


    // ─── Write ────────────────────────────────────────────────────────────

    const sendMessage = tool(
        async ({ channel_id, text, thread_ts, broadcast }) => {
            try {
                const sent = await slack.sendMessage(channel_id, { text, threadTs: thread_ts, broadcast, unfurl: false });

                return JSON.stringify({ channel: sent.channel, ts: sent.ts, sent: true });
            }
            catch (error) {
                throw describeSlackError(error, 'sending a message');
            }
        },
        {
            name:        'slack_send_message',
            description: 'Post a message to a Slack channel, or reply in a thread by passing thread_ts. When answering someone who wrote in a thread, reply in that thread.',
            schema: z.object({
                channel_id: channelIdParam,
                text:       textParam,
                thread_ts:  z.string().optional().describe('Reply in the thread with this parent ts. Leave out to post a new message.'),
                broadcast:  z.boolean().default(false).describe('When replying in a thread, also show the reply in the channel.'),
            }),
        },
    );


    const sendDM = tool(
        async ({ user_id, text }) => {
            try {
                const channelId = await slack.openDM(user_id);

                const sent = await slack.sendMessage(channelId, { text, unfurl: false });

                return JSON.stringify({ channel: sent.channel, ts: sent.ts, sent: true });
            }
            catch (error) {
                throw describeSlackError(error, 'sending a direct message');
            }
        },
        {
            name:        'slack_send_dm',
            description: 'Send a direct message to a Slack user, opening the DM if there is not one already. Returns the DM channel id, which the other message tools take.',
            schema: z.object({
                user_id: userIdParam,
                text:    textParam,
            }),
        },
    );


    const react = tool(
        async ({ channel_id, ts, emoji, remove }) => {
            try {
                await slack.react(channel_id, ts, emoji, remove);

                return JSON.stringify({ ok: true });
            }
            catch (error) {
                throw describeSlackError(error, 'reacting to a message');
            }
        },
        {
            name:        'slack_react',
            description: 'Add or remove your own emoji reaction on a Slack message. Useful as a lightweight acknowledgement when a full reply is not wanted.',
            schema: z.object({
                channel_id: channelIdParam,
                ts:         tsParam,
                emoji:      z.string().describe('Emoji name without colons, such as "eyes", "white_check_mark" or a custom emoji\'s name.'),
                remove:     z.boolean().default(false).describe('Remove the reaction instead of adding it.'),
            }),
        },
    );


    const editMessage = tool(
        async ({ channel_id, ts, text }) => {
            try {
                const edited = await slack.editMessage(channel_id, ts, text);

                return JSON.stringify({ ts: edited.ts, edited: true });
            }
            catch (error) {
                throw describeSlackError(error, 'editing a message');
            }
        },
        {
            name:        'slack_edit_message',
            description: 'Rewrite the text of a message the bot itself sent. Messages from other authors cannot be edited.',
            schema: z.object({
                channel_id: channelIdParam,
                ts:         tsParam,
                text:       textParam,
            }),
        },
    );


    const pinMessage = tool(
        async ({ channel_id, ts, unpin }) => {
            try {
                await slack.pin(channel_id, ts, unpin);

                return JSON.stringify({ ok: true });
            }
            catch (error) {
                throw describeSlackError(error, 'pinning a message');
            }
        },
        {
            name:        'slack_pin_message',
            description: 'Pin or unpin a message in a Slack channel.',
            schema: z.object({
                channel_id: channelIdParam,
                ts:         tsParam,
                unpin:      z.boolean().default(false).describe('Unpin instead of pinning.'),
            }),
        },
    );


    // ─── Directory ────────────────────────────────────────────────────────

    const listChannels = tool(
        async ({ include_private, limit, cursor }) => {
            try {
                const page = await slack.listChannels(
                    include_private ? ['public_channel', 'private_channel'] : ['public_channel'],
                    limit,
                    cursor,
                );

                return ToolBudget.value(
                    { channels: page.items.map(listedChannel), next_cursor: page.nextCursor ?? undefined },
                    { hint: 'Lower the limit and page with the cursor.' },
                );
            }
            catch (error) {
                throw describeSlackError(error, 'listing channels');
            }
        },
        {
            name:        'slack_list_channels',
            description: 'List channels in the Slack workspace with the id the message tools take. `member` says whether the bot is in the channel; it can only read and post where it is.',
            schema: z.object({
                include_private: z.boolean().default(false).describe('Also list private channels the bot has been added to.'),
                limit:           z.number().int().min(1).max(200).default(100),
                cursor:          cursorParam,
            }),
        },
    );


    const getChannel = tool(
        async ({ channel_id }) => {
            try {
                return JSON.stringify(listedChannel(await slack.getChannel(channel_id)));
            }
            catch (error) {
                throw describeSlackError(error, 'reading a channel');
            }
        },
        {
            name:        'slack_get_channel',
            description: 'Read one Slack channel: its name, topic, purpose and whether the bot is a member.',
            schema:      z.object({ channel_id: channelIdParam }),
        },
    );


    const getUser = tool(
        async ({ user_id }) => {
            try {
                return JSON.stringify(listedUser(await slack.getUser(user_id)));
            }
            catch (error) {
                throw describeSlackError(error, 'reading a user');
            }
        },
        {
            name:        'slack_get_user',
            description: 'Read one Slack user: their name, title, email and time zone. Use it to turn a user id from a message into a name.',
            schema:      z.object({ user_id: userIdParam }),
        },
    );


    const findUserByEmail = tool(
        async ({ email }) => {
            try {
                return JSON.stringify(listedUser(await slack.findUserByEmail(email)));
            }
            catch (error) {
                throw describeSlackError(error, 'finding a user by email');
            }
        },
        {
            name:        'slack_find_user_by_email',
            description: 'Find the Slack user with an email address, to get the user id the other tools take.',
            schema:      z.object({ email: z.string().describe('The person\'s email address.') }),
        },
    );


    const listUsers = tool(
        async ({ limit, cursor }) => {
            try {
                const page = await slack.listUsers(limit, cursor);

                return ToolBudget.value(
                    { users: page.items.map(listedUser), next_cursor: page.nextCursor ?? undefined },
                    { hint: 'Lower the limit and page with the cursor, or use slack_find_user_by_email.' },
                );
            }
            catch (error) {
                throw describeSlackError(error, 'listing users');
            }
        },
        {
            name:        'slack_list_users',
            description: 'List the people in the Slack workspace. Large workspaces need paging; prefer slack_find_user_by_email when you know the address.',
            schema: z.object({
                limit:  z.number().int().min(1).max(200).default(100),
                cursor: cursorParam,
            }),
        },
    );


    return {
        read_tools: [
            fetchMessages,
            fetchThread,
            listPins,
        ],

        write_tools: [
            sendMessage,
            sendDM,
            react,
            editMessage,
            pinMessage,
        ],

        directory_tools: [
            listChannels,
            getChannel,
            getUser,
            findUserByEmail,
            listUsers,
        ],
    };
}
