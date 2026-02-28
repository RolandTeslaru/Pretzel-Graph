import { Service } from "../ServiceManager";
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants";
import { WebSocketServer, WebSocket } from 'ws';
import { Realtime } from "@vx-agent-editor/shared/domain/Realtime";

@Service("Realtime")
export class RealtimeServiceImpl {
    private redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT })


    constructor() { }

    private subscriptions = new Map<Realtime.Topic.Id, Set<WebSocket>>()
    // {
    //   [topic]: Set<client WebSocket>
    // }

    public initWebSocket(wss: WebSocketServer) {
        wss.on('connection', (ws, req) => {
            console.log('WebSocket client connected');

            ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());

                if (msg.action === "subscribe")
                    this.subscribe(ws, msg.topic);  // e.g., "job:abc-123:events"
                if (msg.action === "unsubscribe")
                    this.unsubscribe(ws, msg.topic);
            });

            ws.on('close', () => this.removeClientFromAll(ws));
        })

        this.redisSub.psubscribe('*', (err) => {
            if (err)
                console.error('Redis psubscribe error', err);
        });

        // Relay Redis → WebSocket
        this.redisSub.on('pmessage', (pattern, topicId, serializedEvent) => {
            const clients = this.subscriptions.get(topicId as Realtime.Topic.Id);
            if (clients)
                clients.forEach(ws => {
                    if (ws.readyState === WebSocket.OPEN)
                        ws.send(serializedEvent);
                });
        });
    }

    private subscribe(ws: WebSocket, topicId: Realtime.Topic.Id) {
        if (!this.subscriptions.has(topicId))
            this.subscriptions.set(topicId, new Set());

        this.subscriptions.get(topicId)!.add(ws);
    }

    private unsubscribe(ws: WebSocket, topicId: Realtime.Topic.Id) {
        this.subscriptions.get(topicId)?.delete(ws);
    }

    private removeClientFromAll(ws: WebSocket) {
        this.subscriptions.forEach((clients, topicId) => {
            clients.delete(ws);
            if (clients.size === 0)
                this.subscriptions.delete(topicId);
        });
    }

}


export const RealtimeService = Service.get<RealtimeServiceImpl>("Realtime")
