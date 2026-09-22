import WebSocket, { type RawData } from 'ws';
import { GatewaySocket } from '@pretzel-graph/node-sdk';
import { Definition } from './definition';
import { WebSocketConnection } from './events';

// Waits before each reopen after a drop; once they run out the connection is reported failed.
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000];

// Where the handshake goes and what it carries.
type Handshake = {
    url:     string
    headers: Record<string, string>
}

export class WebSocketSocket extends GatewaySocket<typeof Definition> {

    private ws: WebSocket | null = null

    // Set by disconnect, so a close it caused is not mistaken for a drop.
    private stopped = false

    private retries = 0

    private retryTimer: NodeJS.Timeout | null = null

    public async connect(){
        this.stopped = false
        this.retries = 0

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

    // Places the token where the authentication field says: nowhere, a bearer header, or a query parameter.
    private handshake(): Handshake {
        const values = this.fieldValues

        if (values.auth === 'none' || !this.credential)
            return { url: values.url, headers: {} }

        const { token } = this.ctx.credentialsAPI.getDecryptedValue(this.credential.blob)

        if (values.auth === 'bearer')
            return { url: values.url, headers: { Authorization: `Bearer ${token}` } }

        const url = new URL(values.url)

        url.searchParams.set(values.queryParameter || 'token', token)

        return { url: url.toString(), headers: {} }
    }

    // Opens one WebSocket; resolves once it is open, rejects if it never gets there.
    private open(): Promise<void> {
        const { url, headers } = this.handshake()

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url, this.fieldValues.protocols, { headers })

            let opened = false

            this.ws = ws

            ws.on('open', () => {
                opened = true

                // Disconnected while the handshake was in flight.
                if (this.stopped) {
                    ws.close(1000)
                    return resolve()
                }

                this.retries = 0

                resolve()
            })

            ws.on('message', (data, isBinary) => this.dispatchEvent(data, isBinary))

            ws.on('error', error => {
                if (!opened)
                    reject(error)
                else
                    this.ctx.log.warning(`WebSocket connection ${this.connection.id} errored: ${error.message}`)
            })

            ws.on('close', code => {
                if (!opened) {
                    reject(new Error(`The server closed the connection before it opened (code ${code})`))
                    return
                }

                if (this.stopped || this.ws !== ws)
                    return

                this.ws = null

                this.retry(new Error(`The server closed the connection (code ${code})`))
            })
        })
    }

    // Reopens after a drop with growing delays, silently; reports failure once the delays run out.
    private retry(error: Error){
        if (this.retries >= RETRY_DELAYS_MS.length) {
            this.ctx.fail(error)
            return
        }

        const delay = RETRY_DELAYS_MS[this.retries++]

        this.ctx.log.warning(`WebSocket connection ${this.connection.id} dropped, retrying in ${delay}ms: ${error.message}`)

        this.retryTimer = setTimeout(() => {
            this.retryTimer = null

            if (this.stopped)
                return

            this.open().catch(openError => this.retry(openError))
        }, delay)
    }

    protected dispatchEvent(raw: RawData, isBinary: boolean){
        const text = isBinary
            ? Buffer.from(raw as Buffer).toString('utf8')
            : raw.toString()

        let data: unknown = text

        if (this.fieldValues.format === 'json') {
            try {
                data = JSON.parse(text)
            }
            catch {
                this.ctx.log.warning(`WebSocket connection ${this.connection.id} received a message that is not JSON; dropped`)
                return
            }
        }

        this.ctx.dispatch(WebSocketConnection.Event.Message.parse({
            provider:   'websocket',
            type:       'message',
            data,
            receivedAt: new Date().toISOString(),
        }))
    }
}

export { WebSocketSocket as Socket }
