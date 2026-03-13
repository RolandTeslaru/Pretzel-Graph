import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocket } from 'ws';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants";
import { Realtime } from "@vx-agent-editor/shared/domain/Realtime";

@WebSocketGateway()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
    
    private subscriptions = new Map<Realtime.Topic, Set<WebSocket>>();

    constructor() {
        this.redisSub.psubscribe('*', (err) => {
            if (err) console.error('Redis psubscribe error', err);
        });

        this.redisSub.on('pmessage', (pattern, topic, serializedEvent) => {
            const clients = this.subscriptions.get(topic as Realtime.Topic);
            if (clients) {
                clients.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN) {

                        ws.send(serializedEvent);
                    }
                });
            }
        });
    }

    handleConnection(ws: WebSocket) {
        console.log('WebSocket client connected');

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());

                if (msg.action === "subscribe")
                    this.subscribe(ws, msg.topic);
                if (msg.action === "unsubscribe")
                    this.unsubscribe(ws, msg.topic);
            } catch (err) {
                console.error('Invalid WS message:', err);
            }
        });

        ws.on('close', () => this.handleDisconnect(ws));
    }

    handleDisconnect(ws: WebSocket) {
        this.subscriptions.forEach((clients, topicId) => {
            clients.delete(ws);
            if (clients.size === 0) {
                this.subscriptions.delete(topicId);
            }
        });
    }

    private subscribe(ws: WebSocket, topic: Realtime.Topic) {
        if (!this.subscriptions.has(topic)) {
            this.subscriptions.set(topic, new Set());
        }
        this.subscriptions.get(topic)!.add(ws);
    }

    private unsubscribe(ws: WebSocket, topic: Realtime.Topic) {
        this.subscriptions.get(topic)?.delete(ws);
    }
}
