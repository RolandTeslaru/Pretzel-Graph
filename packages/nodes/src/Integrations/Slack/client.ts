import type { HTTP } from '@pretzel-graph/node-sdk';


export const SLACK_BASE_URL = 'https://slack.com/api';

export interface SlackMessage {
    ts:           string
    type?:        string
    subtype?:     string
    text?:        string
    user?:        string
    bot_id?:      string
    thread_ts?:   string
    reply_count?: number
    edited?:      { user?: string, ts: string }
    reactions?:   { name: string, count: number, users?: string[] }[]
    files?:       { id: string, name?: string, url_private?: string }[]
}

export interface SlackChannel {
    id:           string
    name?:        string
    is_channel?:  boolean
    is_group?:    boolean
    is_im?:       boolean
    is_mpim?:     boolean
    is_private?:  boolean
    is_archived?: boolean
    is_member?:   boolean
    user?:        string
    num_members?: number
    topic?:       { value: string }
    purpose?:     { value: string }
}

export interface SlackUser {
    id:         string
    name:       string
    real_name?: string
    deleted?:   boolean
    is_bot?:    boolean
    is_admin?:  boolean
    tz?:        string
    profile?:   { display_name?: string, real_name?: string, email?: string, title?: string }
}

export interface SlackIdentity {
    user_id: string
    bot_id?: string
    team_id: string
    team:    string
    user:    string
}

export interface SendOptions {
    text:       string
    threadTs?:  string
    broadcast?: boolean
    unfurl?:    boolean
}

export interface HistoryOptions {
    limit:   number
    oldest?: string
    latest?: string
    cursor?: string
}

export interface Page<T> {
    items:      T[]
    nextCursor: string | null
}

export type ChannelKind = 'public_channel' | 'private_channel' | 'im' | 'mpim';

// Slack answers most failures with HTTP 200 and ok: false, so the error code travels on this.
export class SlackError extends Error {
    constructor(
        public readonly code:    string,
        public readonly method:  string,
        public readonly needed?: string,
    ) {
        super(`${method}: ${code}`);
        this.name = 'SlackError';
    }
}

type Envelope = { ok: boolean, error?: string, needed?: string, response_metadata?: { next_cursor?: string } };


// One token authenticates every call: the bot token for the Web API, the app token for Socket Mode.
export class SlackAPI {

    private readonly http: HTTP.Client;

    private readonly hooks: HTTP.Client;

    constructor(httpAPI: HTTP.ClientAPI, token: string) {
        this.http = httpAPI.create({
            vendor:  'Slack',
            baseURL: SLACK_BASE_URL,
            headers: { Authorization: `Bearer ${token}` },
        });

        this.hooks = httpAPI.create({ vendor: 'Slack' });
    }


    // ─── Transport ────────────────────────────────────────────────────────

    private async read<T>(method: string, params: Record<string, unknown> = {}): Promise<T & Envelope> {
        return this.unwrap(method, await this.http.get<T & Envelope>(`/${method}`, { params: compact(params) }));
    }

    private async write<T>(method: string, body: Record<string, unknown> = {}): Promise<T & Envelope> {
        return this.unwrap(method, await this.http.post<T & Envelope>(`/${method}`, compact(body), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }));
    }

    private unwrap<T extends Envelope>(method: string, response: T): T {
        if (!response.ok)
            throw new SlackError(response.error ?? 'unknown_error', method, response.needed);

        return response;
    }


    // ─── Identity ─────────────────────────────────────────────────────────

    async whoAmI(): Promise<SlackIdentity> {
        return this.write<SlackIdentity>('auth.test');
    }

    // Needs the app token; every URL is single-use, so each reconnect asks for a fresh one.
    async openSocketURL(): Promise<string> {
        const { url } = await this.write<{ url: string }>('apps.connections.open');

        return url;
    }


    // ─── Messages ─────────────────────────────────────────────────────────

    async sendMessage(channelId: string, options: SendOptions): Promise<{ channel: string, ts: string, message: SlackMessage }> {
        return this.write('chat.postMessage', {
            channel:         channelId,
            text:            options.text,
            thread_ts:       options.threadTs,
            reply_broadcast: options.threadTs ? options.broadcast : undefined,
            unfurl_links:    options.unfurl,
            unfurl_media:    options.unfurl,
        });
    }

    async sendEphemeral(channelId: string, userId: string, text: string, threadTs?: string): Promise<{ message_ts: string }> {
        return this.write('chat.postEphemeral', {
            channel:   channelId,
            user:      userId,
            text,
            thread_ts: threadTs,
        });
    }

    async editMessage(channelId: string, ts: string, text: string): Promise<{ channel: string, ts: string, text: string }> {
        return this.write('chat.update', { channel: channelId, ts, text });
    }

    async deleteMessage(channelId: string, ts: string): Promise<void> {
        await this.write('chat.delete', { channel: channelId, ts });
    }

    async fetchMessages(channelId: string, options: HistoryOptions): Promise<Page<SlackMessage>> {
        const response = await this.read<{ messages: SlackMessage[] }>('conversations.history', {
            channel:   channelId,
            limit:     options.limit,
            oldest:    options.oldest,
            latest:    options.latest,
            cursor:    options.cursor,
            inclusive: false,
        });

        return page(response.messages, response);
    }

    // The first message returned is the thread's parent.
    async fetchThread(channelId: string, threadTs: string, limit: number, cursor?: string): Promise<Page<SlackMessage>> {
        const response = await this.read<{ messages: SlackMessage[] }>('conversations.replies', {
            channel: channelId,
            ts:      threadTs,
            limit,
            cursor,
        });

        return page(response.messages, response);
    }

    // Emoji are names without colons, e.g. "thumbsup".
    async react(channelId: string, ts: string, emoji: string, remove = false): Promise<void> {
        await this.write(remove ? 'reactions.remove' : 'reactions.add', {
            channel:   channelId,
            timestamp: ts,
            name:      emoji.replace(/^:|:$/g, ''),
        });
    }

    async pin(channelId: string, ts: string, unpin = false): Promise<void> {
        await this.write(unpin ? 'pins.remove' : 'pins.add', { channel: channelId, timestamp: ts });
    }

    async listPins(channelId: string): Promise<SlackMessage[]> {
        const { items } = await this.read<{ items: { type: string, message?: SlackMessage }[] }>('pins.list', { channel: channelId });

        return items.flatMap(item => item.message ? [item.message] : []);
    }

    // Slack has no send-to-user endpoint; a DM is a conversation, and this returns the existing one.
    async openDM(userId: string): Promise<string> {
        const { channel } = await this.write<{ channel: { id: string } }>('conversations.open', { users: userId });

        return channel.id;
    }

    // Answers a slash command or interaction through the URL Slack handed with it.
    async respond(responseUrl: string, text: string, inChannel: boolean, replaceOriginal = false): Promise<void> {
        if (!/^https:\/\/hooks\.slack\.com\//.test(responseUrl))
            throw new Error('A response URL must be a https://hooks.slack.com/ address from a Slack event');

        await this.hooks.post(responseUrl, {
            text,
            response_type:    inChannel ? 'in_channel' : 'ephemeral',
            replace_original: replaceOriginal,
        });
    }


    // ─── Channels ─────────────────────────────────────────────────────────

    async getChannel(channelId: string): Promise<SlackChannel> {
        const { channel } = await this.read<{ channel: SlackChannel }>('conversations.info', { channel: channelId });

        return channel;
    }

    async listChannels(kinds: ChannelKind[], limit: number, cursor?: string, includeArchived = false): Promise<Page<SlackChannel>> {
        const response = await this.read<{ channels: SlackChannel[] }>('conversations.list', {
            types:            kinds.join(','),
            limit,
            cursor,
            exclude_archived: !includeArchived,
        });

        return page(response.channels, response);
    }

    async joinChannel(channelId: string): Promise<SlackChannel> {
        const { channel } = await this.write<{ channel: SlackChannel }>('conversations.join', { channel: channelId });

        return channel;
    }


    // ─── Users ────────────────────────────────────────────────────────────

    async getUser(userId: string): Promise<SlackUser> {
        const { user } = await this.read<{ user: SlackUser }>('users.info', { user: userId });

        return user;
    }

    async findUserByEmail(email: string): Promise<SlackUser> {
        const { user } = await this.read<{ user: SlackUser }>('users.lookupByEmail', { email });

        return user;
    }

    async listUsers(limit: number, cursor?: string): Promise<Page<SlackUser>> {
        const response = await this.read<{ members: SlackUser[] }>('users.list', { limit, cursor });

        return page(response.members, response);
    }
}


const page = <T>(items: T[], envelope: Envelope): Page<T> => ({
    items,
    nextCursor: envelope.response_metadata?.next_cursor || null,
});

// Slack reads an empty string as a value, so unset options are left out rather than sent blank.
const compact = (values: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== ''));


// Slack's error codes are terse; the common ones say what to change.
export function describeSlackError(error: unknown, action: string): Error {

    if (!(error instanceof SlackError))
        return new Error(`Slack ${action} failed: ${(error as Error)?.message ?? String(error)}`);

    switch (error.code) {
        case 'not_in_channel':
            return new Error(`Slack refused ${action}: the bot is not in that channel. Invite it with /invite, or join the channel first.`);

        case 'channel_not_found':
            return new Error(`Slack could not find the channel for ${action}. Check the id, and that the bot can see the channel.`);

        case 'missing_scope':
            return new Error(`Slack refused ${action}: the app is missing the ${error.needed ?? 'required'} scope. Add it under OAuth & Permissions and reinstall the app.`);

        case 'invalid_auth':
        case 'not_authed':
        case 'account_inactive':
        case 'token_revoked':
            return new Error(`Slack rejected the token for ${action}. Check the Slack credential.`);

        case 'message_not_found':
        case 'thread_not_found':
            return new Error(`Slack could not find the message for ${action}. Check the channel and timestamp.`);

        case 'cant_update_message':
        case 'cant_delete_message':
            return new Error(`Slack refused ${action}: the bot can only change its own messages.`);

        case 'users_not_found':
        case 'user_not_found':
            return new Error(`Slack could not find the user for ${action}.`);

        case 'ratelimited':
            return new Error(`Slack rate-limited ${action}. Try again shortly.`);

        default:
            return new Error(`Slack ${action} failed: ${error.code}`);
    }
}
