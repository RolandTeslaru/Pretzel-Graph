import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Realtime } from '@pretzel-graph/shared/domain/Realtime';

@Injectable()
export class RealtimeService implements OnModuleDestroy {
    private readonly redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
    private readonly redisPub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    private readonly waiters = new Map<Realtime.Channel, Set<(event: Realtime.Event) => void>>();

    constructor() {
        this.redisSub.on('message', (channel: Realtime.Channel, msg: string) => {
            const channelWaiters = this.waiters.get(channel);
            if (!channelWaiters) 
                return;
            
            const event = JSON.parse(msg) as Realtime.Event;
            
            for (const waiter of channelWaiters) 
                waiter(event);
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
