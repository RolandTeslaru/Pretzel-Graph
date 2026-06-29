import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants";
import { Realtime } from "@pretzel-graph/shared/domain/Realtime";
import { Auth, Chat, Execution } from "@pretzel-graph/shared/domain";
import { createAuthenticatedClient, getUserId } from '../../utils/supabase';
import { PermissionService } from '../Permission/permission.service';

const OWNERSHIP_CACHE_TTL_MS = 30_000;

interface SocketIdentity {
    userId: Auth.User.Id;
}

interface CacheEntry {
    allowed: boolean;
    expiresAt: number;
}

@WebSocketGateway()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    // Cache key: "userId:channel" -> allowed/denied + TTL
    private ownershipCache = new Map<string, CacheEntry>();
    private wsSubscriptions = new Map<Realtime.Channel, Set<WebSocket>>();
    private socketIdentities = new WeakMap<WebSocket, SocketIdentity>();

    constructor(private readonly ownership: PermissionService) {

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
            const supabase = createAuthenticatedClient(token);
            const userId = await getUserId(supabase);

            if (!userId) {
                ws.close(1008, 'Invalid authentication token');
                return;
            }

            this.socketIdentities.set(ws, { userId });
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

    private async verifyChannelOwnership(userId: Auth.User.Id, channel: Realtime.Channel): Promise<boolean> {
        const cacheKey = `${userId}:${channel}`;
        const cached = this.ownershipCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.allowed;
        }

        const result = await this.queryOwnership(userId, channel);
        // Only cache when the resource was found (owned or denied).
        // Don't cache not-found — frontend subscribes preemptively before resource creation.
        if (result !== 'not_found') {
            const cacheEntry: CacheEntry = {
                allowed: result === 'owned',
                expiresAt: Date.now() + OWNERSHIP_CACHE_TTL_MS
            }
            this.ownershipCache.set(cacheKey, cacheEntry);
        }
        return result !== 'denied';
    }


    /**
     * - 'owned': resource exists and belongs to this user (cacheable)
     * - 'denied': resource exists but belongs to another user (cacheable)
     * - 'not_found': resource doesn't exist yet — allow preemptive subscribe (not cached)
     */
    private async queryOwnership(
        userId: Auth.User.Id, 
        channel: Realtime.Channel
    ): Promise<'owned' | 'denied' | 'not_found'> {
        // Channel grammar: <prefix>:<resourceId>[:<sub>...]. The resourceId is always the
        // second segment, so any trailing qualifiers (e.g. :signal:resolved:<reqId>) still
        // resolve to the owning resource rather than slipping through as not_found.
        const [prefix, id] = channel.split(':');

        // Channel prefix → ownership domain. Several prefixes may map to the same domain:
        // human-review channels carry an executionId and authorize via execution ownership.
        const loaders = {
            execution:      this.ownership.loadExecutionOwner,
            'human-review': this.ownership.loadExecutionOwner,
            chat:           this.ownership.loadChatOwner,
        } as const;

        const loader = loaders[prefix as keyof typeof loaders];
        if (!loader) return 'denied'; // unknown channel prefix

        const ownerId = await loader.call(this.ownership, id as any);
        if (!ownerId) return 'not_found';
        return ownerId === userId ? 'owned' : 'denied';
    }


    private async subscribe(ws: WebSocket, channel: Realtime.Channel) {
        const identity = this.socketIdentities.get(ws);
        if (!identity) {
            ws.send(JSON.stringify({ error: 'unauthorized', channel }));
            return;
        }

        const authorized = await this.verifyChannelOwnership(identity.userId, channel);
        if (!authorized) {
            ws.send(JSON.stringify(
                {
                    channel,
                    type: "forbidden",
                    message: "You are not authorized to subscribe to this channel"
                } as Realtime.Event.Forbidden));
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
