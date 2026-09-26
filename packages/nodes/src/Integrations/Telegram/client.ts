import type { HTTP } from '@pretzel-graph/node-sdk';

import { Google } from '../Google/domain';


export const TELEGRAM_BASE_URL = 'https://api.telegram.org';

// The Bot API refuses downloads above this size.
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

// Rate-limit waits at or under this are retried once; longer ones surface to the caller.
const MAX_RETRY_WAIT_S = 5;

export interface TelegramUser {
    id:          number
    is_bot:      boolean
    first_name:  string
    last_name?:  string
    username?:   string
}

export interface TelegramChat {
    id:          number
    type:        string
    title?:      string
    username?:   string
    first_name?: string
    last_name?:  string
    is_forum?:   boolean
}

export interface TelegramMessage {
    message_id:         number
    date:               number
    chat:               TelegramChat
    from?:              TelegramUser
    text?:              string
    caption?:           string
    message_thread_id?: number
    edit_date?:         number
}

export interface TelegramMember {
    status: string
    user:   TelegramUser
}

export interface TelegramUpdate {
    update_id: number
    [type: string]: unknown
}

export type ParseMode = 'none' | 'HTML' | 'MarkdownV2';

export type FileKind = 'photo' | 'document' | 'audio' | 'video' | 'voice' | 'animation';

export interface Button {
    text:           string
    callback_data?: string
    url?:           string
}

export interface SendOptions {
    text:       string
    parseMode?: ParseMode
    replyTo?:   number
    topicId?:   number
    buttons?:   Button[][]
    silent?:    boolean
}

export interface FileOptions {
    source:     string
    caption?:   string
    parseMode?: ParseMode
    replyTo?:   number
    topicId?:   number
    silent?:    boolean
}

// Telegram describes every failure in the body; the code and retry hint travel on this.
export class TelegramError extends Error {
    constructor(
        public readonly code:        number,
        public readonly description: string,
        public readonly method:      string,
        public readonly retryAfter?: number,
    ) {
        super(`${method}: ${code} ${description}`);
        this.name = 'TelegramError';
    }
}

type Envelope<T> = {
    ok:           boolean
    result?:      T
    error_code?:  number
    description?: string
    parameters?:  { retry_after?: number }
};


// The token sits in the base URL's path, never in a request path, so error messages cannot carry it.
export class TelegramAPI {

    private readonly http: HTTP.Client;

    private readonly files: HTTP.Client;

    constructor(httpAPI: HTTP.ClientAPI, token: string) {
        this.http = httpAPI.create({
            vendor:  'Telegram',
            baseURL: `${TELEGRAM_BASE_URL}/bot${token}`,
            // 4xx bodies carry Telegram's description; 5xx stay errors so the client's retries apply.
            validateStatus: status => status < 500,
        });

        this.files = httpAPI.create({
            vendor:  'Telegram',
            baseURL: `${TELEGRAM_BASE_URL}/file/bot${token}`,
        });
    }


    // ─── Transport ────────────────────────────────────────────────────────

    async call<T>(method: string, body: Record<string, unknown> = {}, config: HTTP.RequestConfig = {}, retried = false): Promise<T> {
        const response = await this.http.post<Envelope<T>>(`/${method}`, compact(body), config);

        if (response?.ok)
            return response.result as T;

        const error = new TelegramError(
            response?.error_code ?? 0,
            response?.description ?? 'No response from Telegram',
            method,
            response?.parameters?.retry_after,
        );

        const wait = error.retryAfter ?? Infinity;

        if (error.code === 429 && wait <= MAX_RETRY_WAIT_S && !retried) {
            await new Promise(resolve => setTimeout(resolve, wait * 1000));

            return this.call(method, body, config, true);
        }

        throw error;
    }


    // ─── Bot ──────────────────────────────────────────────────────────────

    async whoAmI(): Promise<TelegramUser & { can_read_all_group_messages?: boolean }> {
        return this.call('getMe');
    }

    async webhookURL(): Promise<string> {
        const { url } = await this.call<{ url: string }>('getWebhookInfo');

        return url;
    }

    // Holds the request open up to `timeoutS` seconds until an update arrives.
    async fetchUpdates(offset: number, timeoutS: number, allowedUpdates: readonly string[], signal?: AbortSignal): Promise<TelegramUpdate[]> {
        return this.call('getUpdates', {
            offset,
            timeout:         timeoutS,
            allowed_updates: allowedUpdates,
        }, {
            signal,
            timeout: (timeoutS + 15) * 1000,
        });
    }


    // ─── Messages ─────────────────────────────────────────────────────────

    async sendMessage(chatId: string, options: SendOptions): Promise<TelegramMessage> {
        return this.call('sendMessage', {
            chat_id:              chatId,
            text:                 options.text,
            ...delivery(options),
            reply_markup:         options.buttons?.length ? { inline_keyboard: options.buttons } : undefined,
            link_preview_options: { is_disabled: true },
        });
    }

    // `source` is a public URL or the file id of a file Telegram already has.
    async sendFile(kind: FileKind, chatId: string, options: FileOptions): Promise<TelegramMessage> {
        const method = `send${kind[0].toUpperCase()}${kind.slice(1)}`;

        return this.call(method, {
            chat_id: chatId,
            [kind]:  options.source,
            caption: options.caption,
            ...delivery(options),
        });
    }

    async editMessage(chatId: string, messageId: number, text: string, parseMode?: ParseMode): Promise<TelegramMessage> {
        return this.call('editMessageText', {
            chat_id:    chatId,
            message_id: messageId,
            text,
            parse_mode: parseMode === 'none' ? undefined : parseMode,
        });
    }

    async deleteMessage(chatId: string, messageId: number): Promise<void> {
        await this.call('deleteMessage', { chat_id: chatId, message_id: messageId });
    }

    // Bots may set one reaction per message; null clears it.
    async react(chatId: string, messageId: number, emoji: string | null): Promise<void> {
        await this.call('setMessageReaction', {
            chat_id:    chatId,
            message_id: messageId,
            reaction:   emoji ? [{ type: 'emoji', emoji }] : [],
        });
    }

    async pin(chatId: string, messageId: number, unpin = false, silent = true): Promise<void> {
        if (unpin)
            await this.call('unpinChatMessage', { chat_id: chatId, message_id: messageId });
        else
            await this.call('pinChatMessage', { chat_id: chatId, message_id: messageId, disable_notification: silent });
    }

    // Shows the bot as typing for about five seconds, or until it sends.
    async startTyping(chatId: string, topicId?: number): Promise<void> {
        await this.call('sendChatAction', { chat_id: chatId, action: 'typing', message_thread_id: topicId });
    }

    // Stops the button's spinner; `text` shows as a toast, or as a dialog when `alert` is set.
    async answerButton(queryId: string, text?: string, alert = false): Promise<void> {
        await this.call('answerCallbackQuery', { callback_query_id: queryId, text, show_alert: alert });
    }


    // ─── Chats ────────────────────────────────────────────────────────────

    async getChat(chatId: string): Promise<TelegramChat & Record<string, unknown>> {
        return this.call('getChat', { chat_id: chatId });
    }

    async getMember(chatId: string, userId: string): Promise<TelegramMember & Record<string, unknown>> {
        return this.call('getChatMember', { chat_id: chatId, user_id: userId });
    }

    async listAdmins(chatId: string): Promise<(TelegramMember & Record<string, unknown>)[]> {
        return this.call('getChatAdministrators', { chat_id: chatId });
    }

    async countMembers(chatId: string): Promise<number> {
        return this.call('getChatMemberCount', { chat_id: chatId });
    }


    // ─── Files ────────────────────────────────────────────────────────────

    // Text only; nothing binary belongs on a port until a real File value exists.
    async readTextFile(fileId: string, mimeType?: string | null): Promise<{ fileName: string, text: string }> {
        const file = await this.call<{ file_path?: string, file_size?: number }>('getFile', { file_id: fileId });

        if (!file.file_path)
            throw new Error('Telegram has no downloadable copy of that file.');

        if (file.file_size && file.file_size > MAX_FILE_BYTES)
            throw new Error('That file is over the 20 MB a bot can download.');

        const fileName = file.file_path.split('/').pop() ?? file.file_path;

        if (!isTextFile(fileName, mimeType))
            throw new Error(`"${fileName}" is not a text file. Only text files can be read.`);

        const data = await this.files.get<ArrayBuffer>(`/${file.file_path}`, { responseType: 'arraybuffer' });

        return { fileName, text: Buffer.from(data).toString('utf8') };
    }
}


const TEXT_EXTENSIONS = /\.(txt|md|csv|tsv|json|xml|ya?ml|log|html?|js|ts|py|sql)$/i;

const isTextFile = (fileName: string, mimeType?: string | null) =>
    mimeType ? Google.Drive.isTextual(mimeType) : TEXT_EXTENSIONS.test(fileName);

const delivery = (options: { parseMode?: ParseMode, replyTo?: number, topicId?: number, silent?: boolean }) => ({
    parse_mode:           options.parseMode === 'none' ? undefined : options.parseMode,
    message_thread_id:    options.topicId,
    reply_parameters:     options.replyTo ? { message_id: options.replyTo, allow_sending_without_reply: true } : undefined,
    disable_notification: options.silent || undefined,
});

// Telegram reads an empty string as a value, so unset options are left out rather than sent blank.
const compact = (values: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== ''));


// Telegram's descriptions are readable already; the common ones get the fix appended.
export function describeTelegramError(error: unknown, action: string): Error {

    if (!(error instanceof TelegramError))
        return new Error(`Telegram ${action} failed: ${(error as Error)?.message ?? String(error)}`);

    const detail = error.description.replace(/^(Bad Request|Forbidden|Conflict|Unauthorized): /, '');

    if (error.code === 401)
        return new Error(`Telegram rejected the bot token for ${action}. Check the Telegram credential.`);

    if (error.code === 403)
        return new Error(`Telegram refused ${action}: ${detail}. The bot may have been blocked, removed from the chat, or lack admin rights.`);

    if (error.code === 429)
        return new Error(`Telegram rate-limited ${action}; retry in ${error.retryAfter ?? 'a few'} seconds.`);

    if (/chat not found/i.test(detail))
        return new Error(`Telegram could not find the chat for ${action}. The bot only reaches chats it is in, or people who have messaged it first.`);

    if (/can't parse entities/i.test(detail))
        return new Error(`Telegram could not parse the formatting for ${action}: ${detail}. Switch the format to plain text, or escape the markup.`);

    return new Error(`Telegram ${action} failed: ${detail}`);
}
