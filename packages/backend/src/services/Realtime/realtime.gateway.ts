import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { createRedisClient, createRedisSubscriber } from '../../utils/redis';
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants";
import { Realtime } from "@pretzel-graph/shared/domain/Realtime";
import { Auth, Chat, Execution } from "@pretzel-graph/shared/domain";
import { verifyToken } from '../../utils/auth';

interface SocketIdentity {
    userId: Auth.User.Id;
}

@WebSocketGateway()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private redisSub = createRedisSubscriber('realtime.gateway');

    private wsSubscriptions = new Map<Realtime.Channel, Set<WebSocket>>();
    private socketIdentities = new WeakMap<WebSocket, SocketIdentity>();

    constructor() {

        this.redisSub.on('message', (channel: Realtime.Channel, serializedEvent: string) => {

            const clients = this.wsSubscriptions.get(channel);
            if (!clients)
                return;

            clients.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN)
                    ws.send(serializedEvent);
            });
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
            const verified = await verifyToken(token);

            if (!verified) {
                ws.close(1008, 'Invalid authentication token');
                return;
            }

            this.socketIdentities.set(ws, { userId: verified.userId });
        } catch {
            ws.close(1008, 'Authentication failed');
            return;
        }

        authenticated = true;

        // Replay any messages that arrived during auth
        for (const raw of pendingMessages)
            this.handleMessage(ws, raw);
    }

    private async handleMessage(ws: WebSocket, raw: string) {
        try {
            const msg = JSON.parse(raw);

            if (msg.action === "subscribe")
                await this.subscribe(ws, msg.channel);
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
                this.redisSub.unsubscribe(channel);
            }
        });
    }

    private async subscribe(ws: WebSocket, channel: Realtime.Channel) {
        const identity = this.socketIdentities.get(ws);
        if (!identity) {
            ws.send(JSON.stringify({ error: 'unauthorized', channel }));
            return;
        }

        if (!this.wsSubscriptions.has(channel)) {
            this.wsSubscriptions.set(channel, new Set());
            this.redisSub.subscribe(channel);
        }
        this.wsSubscriptions.get(channel)!.add(ws);
    }

    private unsubscribe(ws: WebSocket, channel: Realtime.Channel) {
        const identity = this.socketIdentities.get(ws);
        if (!identity) return;

        this.wsSubscriptions.get(channel)?.delete(ws);

        if (this.wsSubscriptions.get(channel)?.size === 0) {
            this.wsSubscriptions.delete(channel);
            this.redisSub.unsubscribe(channel);
        }
    }
}
