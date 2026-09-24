import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createRedisClient, createRedisSubscriber } from '../../utils/redis';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Realtime } from '@pretzel-graph/shared/domain/Realtime';
import { System } from '@pretzel-graph/shared/system';
import { z } from 'zod';

@Injectable()
export class RealtimeService implements OnModuleDestroy {
    private readonly log = System.log.withContext("Realtime");
    private readonly redisSub = createRedisSubscriber('realtime.service');
    private readonly redisPub = createRedisClient('realtime.service.pub');

    private readonly waiters = new Map<Realtime.Channel, Set<(event: Realtime.Event) => void>>();

    /** Standing subscriptions, unlike `waiters` which are one-shot and time out. */
    private readonly listeners = new Map<Realtime.Channel, Set<(event: Realtime.Event) => void>>();

    /** Standing pattern subscriptions, keyed by the glob pattern. */
    private readonly patternListeners = new Map<Realtime.Channel, Set<(message: unknown, channel: Realtime.Channel) => void>>();

    constructor() {
        this.redisSub.on('message', (channel: Realtime.Channel, msg: string) => {
            const channelWaiters   = this.waiters.get(channel);
            const channelListeners = this.listeners.get(channel);

            if (!channelWaiters && !channelListeners)
                return;

            const event = JSON.parse(msg) as Realtime.Event;

            for (const waiter of channelWaiters ?? [])
                waiter(event);

            for (const listener of channelListeners ?? [])
                listener(event);
        });

        this.redisSub.on('pmessage', (pattern: Realtime.Channel, channel: Realtime.Channel, msg: string) => {
            const listeners = this.patternListeners.get(pattern);

            if (!listeners)
                return;

            let message: unknown;

            try {
                message = JSON.parse(msg);
            }
            catch {
                return;
            }

            for (const listener of listeners)
                listener(message, channel);
        });
    }

    /**
     * Await a typed event on a channel, with a timeout. Resolves `true` when an event of
     * `eventType` arrives, `false` on timeout. The general primitive — the trigger may be a
     * signal (see signalAndAwaitEvent) or anything else (e.g. a worker picking up a queued job).
     *
     * Register this BEFORE causing the event, or a fast reply can land before we're listening.
     */
    public awaitEvent(
        eventChannel: Realtime.Channel,
        eventType: string,
        timeoutMs: number = 5000,
        match?: (event: Realtime.Event) => boolean,
    ): Promise<boolean> {

        return new Promise<boolean>((resolve) => {

            const waiter = (event: Realtime.Event) => {
                if (event.type !== eventType)
                    return;

                // Type alone isn't always enough to identify the reply — e.g. session patches
                // all share one type, so the caller narrows by payload.
                if (match && !match(event))
                    return;

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

                        if (!this.listeners.has(eventChannel))
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

    /** A standing subscription to one channel, for events or signals; returns its own removal. */
    public subscribe<T extends Realtime.Event | Realtime.Signal>(
        channel: Realtime.Channel,
        handler: (message: T) => void,
    ): () => void {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, new Set());
            this.redisSub.subscribe(channel);
        }

        const listener = handler as (message: Realtime.Event) => void;

        this.listeners.get(channel)!.add(listener);

        return () => {
            const channelListeners = this.listeners.get(channel);

            if (!channelListeners)
                return;

            channelListeners.delete(listener);

            if (channelListeners.size === 0 && !this.waiters.has(channel)) {
                this.listeners.delete(channel);
                this.redisSub.unsubscribe(channel);
            }
        };
    }

    /** A standing subscription to every channel matching a glob pattern, for events or signals; pass a schema to validate each message, or undefined to only cast. Returns its own removal. */
    public psubscribe<T extends Realtime.Event | Realtime.Signal>(
        pattern: Realtime.Channel,
        schema: z.ZodType<T> | undefined,
        handler: (message: T, channel: Realtime.Channel) => void,
    ): () => void {
        const listener = (message: unknown, channel: Realtime.Channel) => {
            if (!schema)
                return handler(message as T, channel);

            const parsed = schema.safeParse(message);

            if (!parsed.success) {
                this.log.warning(`Ignored malformed message on ${pattern}: ${parsed.error.message}`);
                return;
            }

            handler(parsed.data, channel);
        };

        if (!this.patternListeners.has(pattern)) {
            this.patternListeners.set(pattern, new Set());
            this.redisSub.psubscribe(pattern);
        }

        this.patternListeners.get(pattern)!.add(listener);

        return () => {
            const listeners = this.patternListeners.get(pattern);

            if (!listeners)
                return;

            listeners.delete(listener);

            if (listeners.size === 0) {
                this.patternListeners.delete(pattern);
                this.redisSub.punsubscribe(pattern);
            }
        };
    }

    public emitSignal<T extends Realtime.Signal>(signal: T){
        this.redisPub.publish(signal.channel, JSON.stringify(signal));
    }

    /** Outbound, to whoever is subscribed to the event's own channel. */
    public emitEvent<T extends Realtime.Event>(event: T){
        this.redisPub.publish(event.channel, JSON.stringify(event));
    }

    // Send a signal then await the worker's confirmation event. Registers the waiter BEFORE
    // emitting so a fast reply can't land before we're listening. Resolves true if confirmed,
    // false on timeout. Mirror of the worker's emitAndAwaitSignal.
    public signalAndAwaitEvent<S extends Realtime.Signal>(
        signal:       S,
        eventChannel: Realtime.Channel,
        eventType:    string,
        timeoutMs:    number = 5000,
        match?:       (event: Realtime.Event) => boolean,
    ): Promise<boolean> {
        const confirmation = this.awaitEvent(eventChannel, eventType, timeoutMs, match);
        this.emitSignal(signal);
        return confirmation;
    }

    onModuleDestroy() {
        this.redisSub.disconnect();
        this.redisPub.disconnect();
    }
}
