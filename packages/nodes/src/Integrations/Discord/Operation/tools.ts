import { tool } from '@langchain/core/tools';
import { ToolBudget } from '@pretzel-graph/node-sdk';
import { z } from 'zod/v3';

import type {
    APIChannel,
    APIGuildMember,
    APIMessage,
    APIRole,
    RESTAPIPartialCurrentUserGuild,
} from 'discord-api-types/v10';

import { DiscordAPI, describeDiscordError, type MessageAnchor } from '../client';


const channelIdParam = z.string()
    .describe('Channel id (a numeric snowflake). A Discord event carries it as channelId; otherwise use discord_list_channels.');

const serverIdParam = z.string()
    .describe('Server id (a numeric snowflake). A Discord event carries it as guildId; otherwise use discord_list_servers.');

const messageIdParam = z.string()
    .describe('Message id, taken from the `id` of a message returned by discord_fetch_messages.');


/**
 * A message as an agent needs it, which is far less than Discord sends.
 *
 * The raw object carries the full author record, mentions arrays, embeds, components, flags and
 * reaction objects — fetching 50 of those would crowd out the conversation they were fetched for.
 * Run mode keeps everything: a node passing messages to another node isn't paying for context.
 */
const listedMessage = (message: APIMessage) => ({
    id:          message.id,
    author:      `${message.author.username}${message.author.bot ? ' (bot)' : ''}`,
    author_id:   message.author.id,
    content:     message.content || undefined,
    timestamp:   message.timestamp,
    edited:      message.edited_timestamp ?? undefined,
    reply_to:    message.message_reference?.message_id,
    attachments: message.attachments.length ? message.attachments.map(a => a.filename) : undefined,
    reactions:   message.reactions?.map(r => `${r.emoji.name}x${r.count}`),
});


const listedChannel = (channel: APIChannel) => ({
    id:     channel.id,
    name:   'name' in channel ? channel.name ?? undefined : undefined,
    type:   channel.type,
    topic:  'topic' in channel ? channel.topic ?? undefined : undefined,
    parent: 'parent_id' in channel ? channel.parent_id ?? undefined : undefined,
});


const listedMember = (member: APIGuildMember) => ({
    id:       member.user?.id,
    username: member.user?.username,
    nickname: member.nick ?? undefined,
    bot:      member.user?.bot || undefined,
    roles:    member.roles.length ? member.roles : undefined,
    joined:   member.joined_at,
});


const listedRole = (role: APIRole) => ({
    id:       role.id,
    name:     role.name,
    position: role.position,
    managed:  role.managed || undefined,
});


const listedServer = (server: RESTAPIPartialCurrentUserGuild) => ({
    id:    server.id,
    name:  server.name,
    owner: server.owner || undefined,
});


export function buildTools(discord: DiscordAPI) {

    // ─── Read ─────────────────────────────────────────────────────────────

    const fetchMessages = tool(
        async ({ channel_id, limit, before, after, around }) => {

            const anchor: MessageAnchor =
                before ? 'before' :
                after  ? 'after'  :
                around ? 'around' : 'latest';

            try {
                const messages = await discord.fetchMessages(channel_id, {
                    limit,
                    anchor,
                    anchorId: before ?? after ?? around,
                });

                return ToolBudget.list('messages', messages.map(listedMessage), {
                    hint: 'Lower the limit, or page with before/after.',
                });
            }
            catch (error) {
                throw describeDiscordError(error, 'fetching messages');
            }
        },
        {
            name:        'discord_fetch_messages',
            description: 'Read recent messages from a Discord channel, newest first. Page backwards with `before` set to the oldest id you have received. Discord returns at most 100 at a time and offers no full-text search, so finding an old message means paging.',
            schema: z.object({
                channel_id: channelIdParam,
                limit:      z.number().int().min(1).max(100).default(50).describe('How many messages to return (1-100).'),
                before:     z.string().optional().describe('Return messages older than this message id.'),
                after:      z.string().optional().describe('Return messages newer than this message id.'),
                around:     z.string().optional().describe('Return messages either side of this message id.'),
            }),
        },
    );


    const listPins = tool(
        async ({ channel_id }) => {
            try {
                const messages = await discord.listPins(channel_id);

                return ToolBudget.list('pinned', messages.map(listedMessage));
            }
            catch (error) {
                throw describeDiscordError(error, 'listing pins');
            }
        },
        {
            name:        'discord_list_pins',
            description: 'List the pinned messages in a Discord channel. Pins are what a channel treats as important, so this is a cheap way to get its standing context.',
            schema:      z.object({ channel_id: channelIdParam }),
        },
    );


    // ─── Write ────────────────────────────────────────────────────────────

    const sendMessage = tool(
        async ({ channel_id, content, reply_to_id }) => {
            try {
                const message = await discord.sendMessage(channel_id, {
                    content,
                    replyToId:        reply_to_id,
                    suppressMentions: true,
                });

                return JSON.stringify({ id: message.id, sent: true });
            }
            catch (error) {
                throw describeDiscordError(error, 'sending a message');
            }
        },
        {
            name:        'discord_send_message',
            description: 'Post a message to a Discord channel. Content is limited to 2000 characters; longer text has to be split across calls. @everyone, @here and role pings are suppressed.',
            schema: z.object({
                channel_id:  channelIdParam,
                content:     z.string().max(2000).describe('The message text, at most 2000 characters.'),
                reply_to_id: z.string().optional().describe('Message id to reply to, which pings its author.'),
            }),
        },
    );


    const react = tool(
        async ({ channel_id, message_id, emoji, remove }) => {
            try {
                await discord.react(channel_id, message_id, emoji, remove);

                return JSON.stringify({ ok: true });
            }
            catch (error) {
                throw describeDiscordError(error, 'reacting to a message');
            }
        },
        {
            name:        'discord_react',
            description: 'Add or remove your own reaction on a Discord message. Useful as a lightweight acknowledgement when a full reply is not wanted.',
            schema: z.object({
                channel_id: channelIdParam,
                message_id: messageIdParam,
                emoji:      z.string().describe('A unicode emoji such as "👍", or "name:id" for a custom server emoji.'),
                remove:     z.boolean().default(false).describe('Remove the reaction instead of adding it.'),
            }),
        },
    );


    const editMessage = tool(
        async ({ channel_id, message_id, content }) => {
            try {
                const message = await discord.editMessage(channel_id, message_id, content);

                return JSON.stringify({ id: message.id, edited: true });
            }
            catch (error) {
                throw describeDiscordError(error, 'editing a message');
            }
        },
        {
            name:        'discord_edit_message',
            description: 'Rewrite the content of a message the bot itself sent. Messages from other authors cannot be edited.',
            schema: z.object({
                channel_id: channelIdParam,
                message_id: messageIdParam,
                content:    z.string().max(2000).describe('The replacement text, at most 2000 characters.'),
            }),
        },
    );


    const pinMessage = tool(
        async ({ channel_id, message_id, unpin }) => {
            try {
                await discord.pin(channel_id, message_id, unpin);

                return JSON.stringify({ ok: true });
            }
            catch (error) {
                throw describeDiscordError(error, 'pinning a message');
            }
        },
        {
            name:        'discord_pin_message',
            description: 'Pin or unpin a message in a Discord channel. A channel holds at most 50 pins.',
            schema: z.object({
                channel_id: channelIdParam,
                message_id: messageIdParam,
                unpin:      z.boolean().default(false).describe('Unpin instead of pinning.'),
            }),
        },
    );


    // ─── Directory ────────────────────────────────────────────────────────

    const listChannels = tool(
        async ({ server_id }) => {
            try {
                const channels = await discord.listChannels(server_id);

                return ToolBudget.list('channels', channels.map(listedChannel));
            }
            catch (error) {
                throw describeDiscordError(error, 'listing channels');
            }
        },
        {
            name:        'discord_list_channels',
            description: 'List every channel in a Discord server the bot can see, with the id needed by the message tools.',
            schema:      z.object({ server_id: serverIdParam }),
        },
    );


    const getChannel = tool(
        async ({ channel_id }) => {
            try {
                return JSON.stringify(listedChannel(await discord.getChannel(channel_id)));
            }
            catch (error) {
                throw describeDiscordError(error, 'reading a channel');
            }
        },
        {
            name:        'discord_get_channel',
            description: 'Read one Discord channel: its name, type and topic.',
            schema:      z.object({ channel_id: channelIdParam }),
        },
    );


    const searchMembers = tool(
        async ({ server_id, query, limit }) => {
            try {
                const members = await discord.searchMembers(server_id, query, limit);

                return ToolBudget.list('members', members.map(listedMember));
            }
            catch (error) {
                throw describeDiscordError(error, 'member search');
            }
        },
        {
            name:        'discord_search_members',
            description: 'Find members of a Discord server whose username or nickname starts with a prefix. Use it to turn a name into the user id the other tools take.',
            schema: z.object({
                server_id: serverIdParam,
                query:     z.string().describe('Prefix of a username or nickname.'),
                limit:     z.number().int().min(1).max(100).default(20),
            }),
        },
    );


    const getMember = tool(
        async ({ server_id, user_id }) => {
            try {
                return JSON.stringify(listedMember(await discord.getMember(server_id, user_id)));
            }
            catch (error) {
                throw describeDiscordError(error, 'member lookup');
            }
        },
        {
            name:        'discord_get_member',
            description: 'Read one member of a Discord server: their nickname, roles and join date.',
            schema: z.object({
                server_id: serverIdParam,
                user_id:   z.string().describe('User id, from a message\'s author_id or discord_search_members.'),
            }),
        },
    );


    const listRoles = tool(
        async ({ server_id }) => {
            try {
                const roles = await discord.listRoles(server_id);

                return ToolBudget.list('roles', roles.map(listedRole));
            }
            catch (error) {
                throw describeDiscordError(error, 'listing roles');
            }
        },
        {
            name:        'discord_list_roles',
            description: 'List a Discord server\'s roles, which resolve the role ids carried on a member.',
            schema:      z.object({ server_id: serverIdParam }),
        },
    );


    const listServers = tool(
        async () => {
            try {
                const servers = await discord.listServers();

                return ToolBudget.list('servers', servers.map(listedServer));
            }
            catch (error) {
                throw describeDiscordError(error, 'listing servers');
            }
        },
        {
            name:        'discord_list_servers',
            description: 'List the Discord servers this bot has been invited to, with the id the server-scoped tools take.',
            schema:      z.object({}),
        },
    );


    const getServer = tool(
        async ({ server_id }) => {
            try {
                const server = await discord.getServer(server_id);

                return JSON.stringify({
                    id:          server.id,
                    name:        server.name,
                    description: server.description ?? undefined,
                    owner_id:    server.owner_id,
                });
            }
            catch (error) {
                throw describeDiscordError(error, 'reading a server');
            }
        },
        {
            name:        'discord_get_server',
            description: 'Read one Discord server: its name, description and owner.',
            schema:      z.object({ server_id: serverIdParam }),
        },
    );


    return {
        read_tools: [
            fetchMessages,
            listPins,
        ],

        write_tools: [
            sendMessage,
            react,
            editMessage,
            pinMessage,
        ],

        directory_tools: [
            listChannels,
            getChannel,
            searchMembers,
            getMember,
            listRoles,
            listServers,
            getServer,
        ],
    };
}
