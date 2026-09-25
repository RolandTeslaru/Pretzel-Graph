import { GatewaySocket } from '@pretzel-graph/node-sdk';

import { bareHTTP } from '../../utils';
import { TelegramAPI, TelegramError, describeTelegramError, type TelegramUpdate } from '../../Integrations/Telegram/client';
import { Telegram } from '../../Integrations/Telegram/domain';
import { Definition } from './definition';
import { Mapper, mentionsBot, type BotIdentity } from './mappers';

// Waits before each retry after a failed poll; once they run out the connection is reported failed.
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000];

// How long Telegram holds each poll open waiting for an update.
const POLL_TIMEOUT_S = 30;

type Mapped = { type: string } & Record<string, unknown>;

const MESSAGE_TYPES = new Set(['message', 'edited_message', 'channel_post', 'edited_channel_post']);


// Telegram has no socket; a long poll held open until an update arrives delivers just as fast.
export class TelegramSocket extends GatewaySocket<typeof Definition> {

    private me: BotIdentity = { id: '', username: null }

    // The next update id to ask for; everything below it is confirmed and never redelivered.
    private offset = 0

    private controller: AbortController | null = null

    public async connect(){
        const { botToken } = this.ctx.credentialsAPI.getDecryptedValue(this.credential.blob)

        const api    = new TelegramAPI(bareHTTP(), botToken)
        const signal = (this.controller = new AbortController()).signal

        try {
            const bot = await api.whoAmI()

            this.me = { id: String(bot.id), username: bot.username ?? null }

            // A webhook blocks polling; removing it would silently break whatever set it.
            const webhook = await api.webhookURL()

            if (webhook)
                throw new Error(`This bot delivers to a webhook (${new URL(webhook).host}). Remove it with deleteWebhook, or use a different bot.`)

            await this.skipBacklog(api, signal)
        }
        catch (error) {
            throw error instanceof TelegramError ? this.describe(error) : error
        }

        // A bot's id is fixed for its lifetime, so it outlives both the token and the connection row.
        this.ctx.identify(this.me.id)

        void this.poll(api, signal)
    }

    public async disconnect(){
        this.controller?.abort()
        this.controller = null
    }

    // Confirms everything that arrived while nobody was listening, so a reconnect starts from now.
    private async skipBacklog(api: TelegramAPI, signal: AbortSignal){
        const [latest] = await api.fetchUpdates(-1, 0, Telegram.ALLOWED_UPDATES, signal)

        this.offset = latest ? latest.update_id + 1 : 0
    }

    private async poll(api: TelegramAPI, signal: AbortSignal){
        let failures = 0

        while (!signal.aborted) {
            try {
                const updates = await api.fetchUpdates(this.offset, POLL_TIMEOUT_S, Telegram.ALLOWED_UPDATES, signal)

                failures = 0

                for (const update of updates) {
                    this.offset = update.update_id + 1
                    this.dispatchEvent(update)
                }
            }
            catch (error) {
                if (signal.aborted)
                    return

                // Another poller or a new webhook took the bot over; retrying would only take it back.
                if (error instanceof TelegramError && (error.code === 409 || error.code === 401)) {
                    this.ctx.fail(this.describe(error))
                    return
                }

                if (failures >= RETRY_DELAYS_MS.length) {
                    this.ctx.fail(describeTelegramError(error, 'polling for updates'))
                    return
                }

                const delay = RETRY_DELAYS_MS[failures++]

                this.ctx.log.warning(`Telegram connection ${this.connection.id} poll failed, retrying in ${delay}ms: ${(error as Error).message}`)

                await sleep(delay, signal)
            }
        }
    }

    private describe(error: TelegramError){
        if (error.code === 409 && /webhook/i.test(error.description))
            return new Error('This bot delivers to a webhook. Remove it with deleteWebhook, or use a different bot.')

        if (error.code === 409)
            return new Error('Another connection started receiving this bot\'s updates, so this one stopped. A Telegram bot can only be received in one place; give each environment its own bot.')

        return describeTelegramError(error, 'connecting')
    }

    protected dispatchEvent(update: TelegramUpdate){
        let event: Mapped | null

        try {
            event = this.mapUpdate(update)
        }
        catch (error) {
            this.ctx.log.warning(`Telegram update ${update.update_id} could not be read: ${(error as Error).message}`)
            return
        }

        if (!event)
            return

        try {
            this.ctx.dispatch(Telegram.Event.Schema.parse(event))
        }
        catch (error) {
            this.ctx.log.error(`Telegram ${event.type} event could not be dispatched: ${(error as Error).message}`)
        }
    }

    private mapUpdate(update: TelegramUpdate): Mapped | null {
        const me   = this.me
        const type = Telegram.ALLOWED_UPDATES.find(name => update[name] !== undefined)

        if (!type)
            return null

        const payload = update[type] as Record<string, any>
        const body    = (Mapper[type] as (value: Record<string, any>, me: BotIdentity) => object)(payload, me)

        return {
            type,
            updateId: update.update_id,
            ...body,
            ...(MESSAGE_TYPES.has(type)
                ? { directMessage: payload.chat?.type === 'private', mentionsMe: mentionsBot(payload, me) }
                : {}),
        }
    }
}


const sleep = (ms: number, signal: AbortSignal) => new Promise<void>(resolve => {
    const timer = setTimeout(resolve, ms)

    signal.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
    }, { once: true })
})

export { TelegramSocket as Socket }
