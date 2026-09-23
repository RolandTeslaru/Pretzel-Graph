import { REST, Routes } from 'discord.js';

import type {
    APIChannel,
    APIGuild,
    APIGuildMember,
    APIMessage,
    APIRole,
    RESTAPIPartialCurrentUserGuild,
} from 'discord-api-types/v10';


export type MessageAnchor = 'latest' | 'before' | 'after' | 'around';

export interface SendOptions {
    content:           string
    replyToId?:        string
    suppressMentions?: boolean
}

export interface FetchOptions {
    limit:     number
    anchor:    MessageAnchor
    anchorId?: string
}


// A bot token authenticates the whole Discord API, so this needs nothing from the gateway socket.
export class DiscordAPI {

    private readonly rest: REST;

    constructor(botToken: string) {
        this.rest = new REST({ version: '10' }).setToken(botToken);
    }


    // ─── Messages ─────────────────────────────────────────────────────────

    async sendMessage(channelId: string, options: SendOptions): Promise<APIMessage> {

        const body: Record<string, unknown> = { content: options.content };

        if (options.replyToId)
            body.message_reference = { message_id: options.replyToId };

        // Blocks @everyone, @here and role pings while leaving user mentions and the reply ping.
        if (options.suppressMentions !== false)
            body.allowed_mentions = { parse: ['users'], replied_user: true };

        return this.rest.post(Routes.channelMessages(channelId), { body }) as Promise<APIMessage>;
    }


    async fetchMessages(channelId: string, options: FetchOptions): Promise<APIMessage[]> {

        const query = new URLSearchParams({ limit: String(options.limit) });

        if (options.anchor !== 'latest' && options.anchorId)
            query.set(options.anchor, options.anchorId);

        return this.rest.get(Routes.channelMessages(channelId), { query }) as Promise<APIMessage[]>;
    }


    async editMessage(channelId: string, messageId: string, content: string): Promise<APIMessage> {
        return this.rest.patch(
            Routes.channelMessage(channelId, messageId),
            { body: { content } },
        ) as Promise<APIMessage>;
    }


    async react(channelId: string, messageId: string, emoji: string, remove = false): Promise<void> {

        // Unicode emoji are percent-encoded; custom ones are "name:id".
        const route = Routes.channelMessageOwnReaction(channelId, messageId, encodeURIComponent(emoji));

        if (remove)
            await this.rest.delete(route);
        else
            await this.rest.put(route);
    }


    async pin(channelId: string, messageId: string, unpin = false): Promise<void> {

        const route = Routes.channelPin(channelId, messageId);

        if (unpin)
            await this.rest.delete(route);
        else
            await this.rest.put(route);
    }


    async listPins(channelId: string): Promise<APIMessage[]> {
        return this.rest.get(Routes.channelPins(channelId)) as Promise<APIMessage[]>;
    }


    // ─── Channels ─────────────────────────────────────────────────────────

    async getChannel(channelId: string): Promise<APIChannel> {
        return this.rest.get(Routes.channel(channelId)) as Promise<APIChannel>;
    }


    async listChannels(serverId: string): Promise<APIChannel[]> {
        return this.rest.get(Routes.guildChannels(serverId)) as Promise<APIChannel[]>;
    }


    // ─── Members and roles ────────────────────────────────────────────────

    async getMember(serverId: string, userId: string): Promise<APIGuildMember> {
        return this.rest.get(Routes.guildMember(serverId, userId)) as Promise<APIGuildMember>;
    }


    async searchMembers(serverId: string, search: string, limit: number): Promise<APIGuildMember[]> {

        const query = new URLSearchParams({ query: search, limit: String(limit) });

        return this.rest.get(Routes.guildMembersSearch(serverId), { query }) as Promise<APIGuildMember[]>;
    }


    async listRoles(serverId: string): Promise<APIRole[]> {
        return this.rest.get(Routes.guildRoles(serverId)) as Promise<APIRole[]>;
    }


    // ─── Servers ──────────────────────────────────────────────────────────

    async listServers(): Promise<RESTAPIPartialCurrentUserGuild[]> {
        return this.rest.get(Routes.userGuilds()) as Promise<RESTAPIPartialCurrentUserGuild[]>;
    }


    async getServer(serverId: string): Promise<APIGuild> {
        return this.rest.get(Routes.guild(serverId)) as Promise<APIGuild>;
    }
}


// Member reads need the Server Members intent, and Discord answers a missing one with a bare 403.
export function describeDiscordError(error: unknown, action: string): Error {

    const status  = (error as { status?: number })?.status;
    const message = (error as { message?: string })?.message ?? String(error);

    if (status === 403 && action.includes('member'))
        return new Error(
            `Discord refused ${action} (403). Enable the Server Members intent for this bot `
            + `in the Discord developer portal, under Bot → Privileged Gateway Intents.`,
        );

    if (status === 403)
        return new Error(`Discord refused ${action} (403). The bot lacks permission in that server or channel.`);

    if (status === 404)
        return new Error(`Discord could not find the target of ${action} (404). Check the ids.`);

    return new Error(`Discord ${action} failed: ${message}`);
}
