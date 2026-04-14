import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '@vx-agent-editor/shared/constants';
import { Realtime } from '@vx-agent-editor/shared/domain/Realtime';
import { Orchestrator } from '@vx-agent-editor/shared/domain';

@Injectable()
export class RealtimeService implements OnModuleDestroy {
    private readonly redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
    private readonly redisPub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    
    private readonly waiters = new Map<string, Set<(event: Orchestrator.Event) => void>>();

    constructor() {
        this.redisSub.on('message', (channel, msg) => {
            const channelWaiters = this.waiters.get(channel);
            if (!channelWaiters) return;
            const event = JSON.parse(msg) as Orchestrator.Event;
            for (const waiter of channelWaiters) waiter(event);
        });
    }

    private static readonly TERMINAL_TYPES = new Set<Orchestrator.Event['type']>(['completed', 'failed', 'terminated']);

    public withTerminalEvent(
        eventChannel: Orchestrator.Event.Channel,
        timeoutMs: number = 10 * 60_000
    ): Promise<Orchestrator.Event | null> {
        return new Promise<Orchestrator.Event | null>((resolve) => {
            const waiter = (event: Orchestrator.Event) => {
                if (!RealtimeService.TERMINAL_TYPES.has(event.type)) return;
                clearTimeout(timeout);
                cleanup();
                resolve(event);
            };

            const cleanup = () => {
                const channelWaiters = this.waiters.get(eventChannel);
                if (channelWaiters) {
                    channelWaiters.delete(waiter);
                    if (channelWaiters.size === 0) {
                        this.waiters.delete(eventChannel);
                        this.redisSub.unsubscribe(eventChannel);
                    }
                }
            };

            const timeout = setTimeout(() => {
                cleanup();
                resolve(null);
            }, timeoutMs);

            if (!this.waiters.has(eventChannel)) {
                this.waiters.set(eventChannel, new Set());
                this.redisSub.subscribe(eventChannel);
            }
            this.waiters.get(eventChannel)!.add(waiter);
        });
    }

    /**
     * Request-reply pattern over Redis pub/sub.
     * Subscribes to the event channel BEFORE the caller emits a signal,
     * then waits for the worker to publish a matching confirmation event.
     * Resolves `true` if the worker confirms, `false` if it times out.
     *
     * Must be called before `emitSignal` to avoid missing the response.
     */
    public withEventConfirmation(
        eventChannel: Orchestrator.Event.Channel,
        eventType: Orchestrator.Event['type'],
        timeoutMs: number = 5000
    ): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            // Matches incoming events by type and resolves the promise
            const waiter = (event: Orchestrator.Event) => {
                if (event.type !== eventType) return;
                clearTimeout(timeout);
                cleanup();
                resolve(true);
            };

            // Removes the waiter and unsubscribes if no more waiters remain on this channel
            const cleanup = () => {
                const channelWaiters = this.waiters.get(eventChannel);
                if (channelWaiters) {
                    channelWaiters.delete(waiter);
                    if (channelWaiters.size === 0) {
                        this.waiters.delete(eventChannel);
                        this.redisSub.unsubscribe(eventChannel);
                    }
                }
            };

            // If the worker never responds, resolve false so the caller knows it wasn't confirmed
            const timeout = setTimeout(() => {
                cleanup();
                resolve(false);
            }, timeoutMs);

            if (!this.waiters.has(eventChannel)) {
                this.waiters.set(eventChannel, new Set());
                this.redisSub.subscribe(eventChannel);
            }
            this.waiters.get(eventChannel)!.add(waiter);
        });
    }

    public emitSignal<T extends Realtime.Signal>(signal: T){
        this.redisPub.publish(signal.channel, JSON.stringify(signal));
    }

    onModuleDestroy() {
        this.redisSub.disconnect();
        this.redisPub.disconnect();
    }
}
