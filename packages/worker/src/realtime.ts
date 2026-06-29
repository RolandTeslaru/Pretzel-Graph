import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants";
import { Realtime } from "@pretzel-graph/shared/domain/Realtime";

// Process-wide realtime layer for the worker: one pub + one sub connection shared across all
// executions. Events go out via emit(); signals are awaited via awaitSignal() through a single
// subscriber that demuxes by channel (waiters map), instead of a Redis connection per wait.
export class RealtimeService {
    private readonly pub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
    private readonly sub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    private readonly waiters = new Map<Realtime.Channel, Set<(raw: string) => void>>();

    constructor() {
        this.sub.on("message", (channel: string, raw: string) => {
            const set = this.waiters.get(channel as Realtime.Channel);
            if (!set) return;
            // Copy: a waiter removes itself during iteration as it settles.
            for (const waiter of [...set]) waiter(raw);
        });
    }

    public emit<T_Event extends Realtime.Event>(event: T_Event) {
        this.pub.publish(event.channel, JSON.stringify(event));
    }

    // First message on `channel` wins, validated by `schema`. Rejects on timeout, on parse
    // failure, or when `abortSignal` fires (execution terminated/suspended). Cleans up its
    // waiter and unsubscribes the channel once no waiters remain.
    public awaitSignal<S>(
        channel:     Realtime.Channel,
        schema:      { parse: (data: unknown) => S },
        timeout:     number,
        abortSignal: AbortSignal,
    ): Promise<S> {
        return new Promise<S>((_resolve, _reject) => {
            if (abortSignal.aborted) 
                return _reject(abortSignal.reason);

            const cleanup = () => {
                clearTimeout(timer);
                abortSignal.removeEventListener("abort", onAbort);
                const set = this.waiters.get(channel);
                if (!set) 
                    return;
                set.delete(waiter);
                
                if (set.size === 0) {
                    this.waiters.delete(channel);
                    this.sub.unsubscribe(channel).catch(() => {});
                }
            };

            const resolve = (value: S)     => { cleanup(); _resolve(value); };
            const reject  = (reason?: any) => { cleanup(); _reject(reason); };

            const waiter = (raw: string) => {
                try { 
                    resolve(schema.parse(JSON.parse(raw))); 
                }
                catch (e) { 
                    reject(e); 
                }
            };

            const onAbort = () => reject(abortSignal.reason);
            const timer = setTimeout(() => reject(new Error("Signal timed out")), timeout);

            abortSignal.addEventListener("abort", onAbort, { once: true });

            if (!this.waiters.has(channel)) {
                this.waiters.set(channel, new Set());
                this.sub.subscribe(channel, (err) => { if (err) reject(err); });
            }
            this.waiters.get(channel)!.add(waiter);
        });
    }

    // Emit an event then await the reply signal. Subscribes BEFORE emitting so a fast reply
    // can't land before the waiter is registered.
    public emitAndAwaitSignal<E extends Realtime.Event, S>(
        event:         E,
        signalChannel: Realtime.Channel,
        signalSchema:  { parse: (data: unknown) => S },
        timeout:       number,
        abortSignal:   AbortSignal,
    ): Promise<S> {
        const signal = this.awaitSignal(signalChannel, signalSchema, timeout, abortSignal);
        this.emit(event);
        return signal;
    }
}
