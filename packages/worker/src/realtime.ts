import type { z } from "zod";
import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants";
import { Execution } from "@pretzel-graph/shared/domain";
import type { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import type { RuntimeNode } from "@pretzel-graph/node-sdk";

// Process-wide realtime layer for the worker: one pub + one sub connection shared across
// every execution running in this process.
//
// An execution has exactly two channels — execution:<id> outbound, execution:<id>:signal
// inbound — and a scope is the only way to reach either. Inbound messages are routed by
// schema plus a correlation predicate, so many independent domains (lifecycle signals, node
// parks) share the one channel without seeing each other's traffic.


// A registration is erased: the router only calls back through `deliver`, and each
// registration's own schema is what re-narrows the message for its handler.
type Registration = {
    schema:  z.ZodType<any>,
    match:   (signal: any) => boolean,
    deliver: (signal: any) => void,
    /** One-shot parks only — close() calls this so nothing is left hanging. */
    cancel?: (reason: unknown) => void,
}


/** Exported for tests — production code gets one from SharedRealtimeService.scope. */
export class RealtimeScopeImpl implements RuntimeNode.RealtimeScope {

    private readonly registrations = new Set<Registration>();
    private readonly eventChannel:  Execution.Event.Channel;

    private closed = false;

    constructor(
        private readonly executionId: Execution.Id,
        private readonly workflowId:  Workflow.Id,
        private readonly publish:     (channel: string, payload: string) => void,
        private readonly onClose:     () => void,
    ) {
        this.eventChannel = Execution.Event.getChannel(executionId);
    }




    // Stamped here, not by the caller: a node never writes the addressing fields, so it
    // cannot reach another execution.
    public emit(event: Execution.Event.Unstamped) {
        this.publish(this.eventChannel, JSON.stringify({
            ...event,
            channel:     this.eventChannel,
            executionId: this.executionId,
            workflowId:  this.workflowId,
        }));
    }




    public onSignal<S extends Execution.Signal.Base>(
        schema:  z.ZodType<S>,
        handler: (signal: S) => void,
    ): () => void {
        const registration: Registration = {
            schema,
            match:   () => true,
            deliver: handler,
        };

        this.registrations.add(registration);

        return () => {
            this.registrations.delete(registration);
        };
    }




    public awaitSignal<S extends Execution.Signal.Base>(
        schema:  z.ZodType<S>,
        match:   (signal: S) => boolean,
        timeout: number,
    ): Promise<S> {
        return this.park(undefined, schema, match, timeout);
    }




    public awaitSignalAfter<S extends Execution.Signal.Base>(
        schema:  z.ZodType<S>,
        match:   (signal: S) => boolean,
        timeout: number,
        action:  () => void | Promise<void>,
    ): Promise<S> {
        return this.park(undefined, schema, match, timeout, action);
    }




    public withAbort(abortSignal: AbortSignal): RuntimeNode.RealtimeAPI {
        return {
            emit:             event                            => this.emit(event),
            onSignal:         (schema, handler)                => this.onSignal(schema, handler),
            awaitSignal:      (schema, match, timeout)         => this.park(abortSignal, schema, match, timeout),
            awaitSignalAfter: (schema, match, timeout, action) => this.park(abortSignal, schema, match, timeout, action),
        };
    }




    public close() {
        if (this.closed)
            return;

        this.closed = true;

        const reason = new Error(`Execution ${this.executionId} ended while a signal was still awaited`);

        for (const registration of [...this.registrations])
            registration.cancel?.(reason);

        this.registrations.clear();
        this.onClose();
    }




    // One inbound message, offered to every registration. Two filters stand between the
    // wire and a handler: the registration's own schema (the z.literal on `type`) decides
    // what kind of signal this is, and `match` decides whether it is addressed to this
    // waiter. A message that satisfies neither is ignored, never rejected — rejecting on
    // another domain's traffic is what made a shared channel unsafe before.
    public dispatch(raw: string) {
        let parsed: unknown;

        try {
            parsed = JSON.parse(raw);
        }
        catch {
            return;
        }

        const base = Execution.Signal.Base.safeParse(parsed);

        if (!base.success)
            return;

        // The channel is per execution, so this should be unreachable — but the id is the
        // ownership boundary, so it is checked rather than assumed.
        if (base.data.executionId !== this.executionId)
            return;

        for (const registration of [...this.registrations]) {

            const signal = registration.schema.safeParse(parsed);

            if (!signal.success)
                continue;

            if (!registration.match(signal.data))
                continue;

            registration.deliver(signal.data);
        }
    }




    private park<S extends Execution.Signal.Base>(
        abortSignal: AbortSignal | undefined,
        schema:      z.ZodType<S>,
        match:       (signal: S) => boolean,
        timeout:     number,
        action?:     () => void | Promise<void>,
    ): Promise<S> {
        return new Promise<S>((_resolve, _reject) => {

            if (this.closed)
                return _reject(new Error(`Realtime scope for execution ${this.executionId} is closed`));

            if (abortSignal?.aborted)
                return _reject(abortSignal.reason);

            const cleanup = () => {
                clearTimeout(timer);
                abortSignal?.removeEventListener("abort", onAbort);
                this.registrations.delete(registration);
            };

            const resolve = (signal: S)    => { cleanup(); _resolve(signal); };
            const reject  = (reason?: any) => { cleanup(); _reject(reason); };

            const onAbort = () => reject(abortSignal!.reason);
            const timer   = setTimeout(() => reject(new Error("Signal timed out")), timeout);

            const registration: Registration = {
                schema,
                match,
                deliver: resolve,
                cancel:  reject,
            };

            abortSignal?.addEventListener("abort", onAbort, { once: true });

            this.registrations.add(registration);

            // Armed above, triggered here: a reply cannot land before the waiter exists.
            // A trigger that fails unregisters instead of parking until timeout.
            if (action) {
                try {
                    void Promise.resolve(action()).catch(reject);
                }
                catch (error) {
                    reject(error);
                }
            }
        });
    }
}




export class SharedRealtimeService {

    private readonly pub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
    private readonly sub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    private readonly scopes = new Map<Execution.Signal.Channel, RealtimeScopeImpl>();

    constructor() {
        this.sub.on("message", (channel: string, raw: string) => {
            this.scopes.get(channel as Execution.Signal.Channel)?.dispatch(raw);
        });
    }




    // Subscribing here rather than at the first park closes the window where a reply lands
    // on a channel nobody is listening to.
    public scope(executionId: Execution.Id, workflowId: Workflow.Id): RuntimeNode.RealtimeScope {
        const channel = Execution.Signal.getChannel(executionId);

        if (this.scopes.has(channel))
            throw new Error(`Realtime scope already open for execution ${executionId}`);

        const scope = new RealtimeScopeImpl(
            executionId,
            workflowId,
            (ch, payload) => { this.pub.publish(ch, payload); },
            () => {
                this.scopes.delete(channel);
                this.sub.unsubscribe(channel).catch(() => {});
            },
        );

        this.scopes.set(channel, scope);

        this.sub.subscribe(channel).catch(err =>
            console.error(`[Realtime] Failed to subscribe to ${channel}:`, err),
        );

        return scope;
    }
}
