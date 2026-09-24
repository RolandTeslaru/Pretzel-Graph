import WebSocket, { type RawData } from 'ws';
import { GatewaySocket } from '@pretzel-graph/node-sdk';

import { bareHTTP } from '../../utils';
import { SlackAPI, describeSlackError, type SlackIdentity } from '../../Integrations/Slack/client';
import { Slack } from '../../Integrations/Slack/domain';
import { Definition } from './definition';
import { CommandMapper, EventMapper } from './mappers';

// Waits before each reopen after a drop; once they run out the connection is reported failed.
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000];

type Frame = Record<string, any>;

type Mapped = { type: string } & Record<string, unknown>;

// Events a bot causes by talking; its own would let a reply start the workflow that sent it.
const SPOKEN_EVENTS = new Set(['message', 'message_changed', 'message_deleted', 'app_mention']);


export class SlackSocket extends GatewaySocket<typeof Definition> {

    private ws: WebSocket | null = null

    // Set by disconnect, so a close it caused is not mistaken for a drop.
    private stopped = false

    private retries = 0

    private retryTimer: NodeJS.Timeout | null = null

    private identity: SlackIdentity | null = null

    public async connect(){
        this.stopped = false
        this.retries = 0

        const { botToken } = this.tokens()

        try {
            this.identity = await new SlackAPI(bareHTTP(), botToken).whoAmI()
        }
        catch (error) {
            throw describeSlackError(error, 'checking the bot token')
        }

        await this.open()
    }

    public async disconnect(){
        this.stopped = true

        if (this.retryTimer)
            clearTimeout(this.retryTimer)

        this.retryTimer = null

        this.ws?.close(1000)
        this.ws = null
    }

    private tokens(){
        const { botToken, appToken } = this.ctx.credentialsAPI.getDecryptedValue(this.credential.blob)

        if (!appToken)
            throw new Error('Add an app token (xapp-) to this Slack credential to receive events, and turn on Socket Mode for the app.')

        return { botToken, appToken }
    }

    // Asks Slack for a fresh socket URL and resolves once Slack says hello on it.
    private async open(): Promise<void> {
        let url: string

        try {
            url = await new SlackAPI(bareHTTP(), this.tokens().appToken).openSocketURL()
        }
        catch (error) {
            throw describeSlackError(error, 'opening Socket Mode')
        }

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url)

            let ready = false

            ws.on('message', data => {
                const frame = parseFrame(data)

                if (!frame)
                    return

                if (frame.type === 'hello') {
                    ready = true

                    // Disconnected while the handshake was in flight.
                    if (this.stopped) {
                        ws.close(1000)
                        return resolve()
                    }

                    this.ws = ws
                    this.retries = 0

                    return resolve()
                }

                if (frame.type === 'disconnect')
                    return this.replace(ws, frame.reason)

                // Slack redelivers anything not acknowledged within three seconds, so ack before handling.
                if (frame.envelope_id) {
                    ws.send(JSON.stringify({ envelope_id: frame.envelope_id }))
                    this.dispatchEvent(frame)
                }
            })

            ws.on('error', error => {
                if (!ready)
                    reject(error)
                else
                    this.ctx.log.warning(`Slack connection ${this.connection.id} errored: ${error.message}`)
            })

            ws.on('close', code => {
                if (!ready) {
                    reject(new Error(`Slack closed the connection before it was ready (code ${code})`))
                    return
                }

                if (this.stopped || this.ws !== ws)
                    return

                this.ws = null

                this.retry(new Error(`Slack closed the connection (code ${code})`))
            })
        })
    }

    // Slack rotates Socket Mode connections; the old one keeps delivering until the new one is up.
    private replace(ws: WebSocket, reason: unknown){
        if (reason === 'link_disabled') {
            this.ctx.fail(new Error('Socket Mode was turned off for this Slack app.'))
            return
        }

        if (this.stopped || this.ws !== ws)
            return

        this.ws = null

        this.open()
            .then(() => ws.close(1000))
            .catch(error => {
                ws.close(1000)
                this.retry(error)
            })
    }

    // Reopens after a drop with growing delays, silently; reports failure once the delays run out.
    private retry(error: Error){
        if (this.retries >= RETRY_DELAYS_MS.length) {
            this.ctx.fail(error)
            return
        }

        const delay = RETRY_DELAYS_MS[this.retries++]

        this.ctx.log.warning(`Slack connection ${this.connection.id} dropped, retrying in ${delay}ms: ${error.message}`)

        this.retryTimer = setTimeout(() => {
            this.retryTimer = null

            if (this.stopped)
                return

            this.open().catch(openError => this.retry(openError))
        }, delay)
    }

    protected dispatchEvent(frame: Frame){
        const payload = frame.payload ?? {}

        let event: Mapped | null

        try {
            event = mapFrame(frame.type, payload)
        }
        catch (error) {
            this.ctx.log.warning(`Slack ${frame.type} payload could not be read: ${(error as Error).message}`)
            return
        }

        if (!event || this.isOwnOrUnchanged(event))
            return

        try {
            this.ctx.dispatch(Slack.Event.Schema.parse({
                ...event,
                teamId: payload.team_id ?? payload.team?.id ?? null,
                ...this.messageFlags(event),
            }))
        }
        catch (error) {
            this.ctx.log.error(`Slack ${event.type} event could not be dispatched: ${(error as Error).message}`)
        }
    }

    // Also drops edits that leave the text alone, which is Slack attaching a link preview.
    private isOwnOrUnchanged(event: Mapped){
        if (!SPOKEN_EVENTS.has(event.type))
            return false

        if (event.type === 'message_changed' && event.text === event.oldText)
            return true

        return event.userId === this.identity?.user_id
            || (Boolean(event.botId) && event.botId === this.identity?.bot_id)
    }

    // Neither flag is answerable from the payload alone: both depend on which bot this connection is.
    private messageFlags(event: Mapped){
        if (event.type !== 'message' && event.type !== 'app_mention')
            return {}

        const botUserId = this.identity?.user_id

        return {
            directMessage: event.channelType === 'im',
            mentionsMe:    event.type === 'app_mention' || (Boolean(botUserId) && String(event.text).includes(`<@${botUserId}>`)),
        }
    }
}


// Events API callbacks, slash commands and interactions each arrive in their own envelope type.
const mapFrame = (envelope: string, payload: Frame): Mapped | null => {
    if (envelope === 'events_api') {
        const raw = payload.event ?? {}

        const type = raw.type === 'message' && (raw.subtype === 'message_changed' || raw.subtype === 'message_deleted')
            ? raw.subtype as string
            : raw.type as string

        return withType(type, (EventMapper as Record<string, ((event: Frame) => object | null) | undefined>)[type]?.(raw))
    }

    if (envelope === 'slash_commands')
        return withType('slash_command', CommandMapper.slash_command(payload))

    if (envelope !== 'interactive')
        return null

    if (payload.type === 'block_actions')
        return withType('block_actions', CommandMapper.block_actions(payload))

    if (payload.type === 'view_submission')
        return withType('view_submission', CommandMapper.view_submission(payload))

    if (payload.type === 'shortcut' || payload.type === 'message_action')
        return withType('shortcut', CommandMapper.shortcut(payload))

    return null
}

const withType = (type: string, body: object | null | undefined): Mapped | null =>
    body ? { type, ...body } : null

const parseFrame = (data: RawData): Frame | null => {
    try {
        return JSON.parse(data.toString())
    }
    catch {
        return null
    }
}

export { SlackSocket as Socket }
