import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants";
import { Realtime } from "@vx-agent-editor/shared/domain/Realtime";
import { createAuthenticatedClient, getUserId } from '../../utils/supabase';

@WebSocketGateway()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    private wsSubscriptions = new Map<Realtime.Channel, Set<WebSocket>>();

    constructor() {
        this.redisSub.psubscribe('*', (err) => {
            if (err) console.error('Redis psubscribe error', err);
        });

        this.redisSub.on('pmessage', (pattern, channel, serializedEvent) => {
            const clients = this.wsSubscriptions.get(channel as Realtime.Channel);
            if (clients) {
                clients.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(serializedEvent);
                    }
                });
            }
        });
    }

    public async handleConnection(ws: WebSocket, req: IncomingMessage) {
        // Buffer messages that arrive during async auth
        const pendingMessages: string[] = [];
        let authenticated = false;

        // Register message handler immediately so no messages are lost
        ws.on('message', (data) => {
            const raw = data.toString();
            if (!authenticated) {
                pendingMessages.push(raw);
                return;
            }
            this.handleMessage(ws, raw);
        });

        ws.on('close', () => this.handleDisconnect(ws));

        // Extract token from query string: ws://host?token=<jwt>
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
            ws.close(1008, 'Missing authentication token');
            return;
        }

        try {
            const supabase = createAuthenticatedClient(token);
            const userId = await getUserId(supabase);

            if (!userId) {
                ws.close(1008, 'Invalid authentication token');
                return;
            }
        } catch {
            ws.close(1008, 'Authentication failed');
            return;
        }

        authenticated = true;

        // Replay any messages that arrived during auth
        for (const raw of pendingMessages) {
            this.handleMessage(ws, raw);
        }
    }

    private handleMessage(ws: WebSocket, raw: string) {
        try {
            const msg = JSON.parse(raw);

            if (msg.action === "subscribe")
                this.subscribe(ws, msg.channel);
            if (msg.action === "unsubscribe")
                this.unsubscribe(ws, msg.channel);
        } catch (err) {
            console.error('Invalid WS message:', err);
        }
    }

    public handleDisconnect(ws: WebSocket) {
        this.wsSubscriptions.forEach((clients, channel) => {
            clients.delete(ws);
            if (clients.size === 0) {
                this.wsSubscriptions.delete(channel);
            }
        });
    }

    private subscribe(ws: WebSocket, channel: Realtime.Channel) {
        if (!this.wsSubscriptions.has(channel)) {
            this.wsSubscriptions.set(channel, new Set());
        }
        this.wsSubscriptions.get(channel)!.add(ws);
    }

    private unsubscribe(ws: WebSocket, channel: Realtime.Channel) {
        this.wsSubscriptions.get(channel)?.delete(ws);

        if (this.wsSubscriptions.get(channel)?.size === 0)
            this.wsSubscriptions.delete(channel);
    }
}
