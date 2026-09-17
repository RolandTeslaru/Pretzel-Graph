import Redis from "ioredis";
import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from "@pretzel-graph/shared/constants";
import { Execution, Realtime } from "@pretzel-graph/shared/domain";
import type { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import type { RuntimeNode } from "@pretzel-graph/node-sdk";
import { bounded } from "../utils";
import { RealtimeScopeImpl } from "./realtime.scope";

const QUIT_TIMEOUT_MS = 1_000;

// Process-wide realtime layer for the worker: one pub + one sub connection shared across
// every execution running in this process.
//
// An execution has exactly two channels — execution:<id> outbound, execution:<id>:signal
// inbound — and a scope is the only way to reach either. Inbound messages are routed by
// schema plus a correlation predicate, so many independent domains (lifecycle signals, node
// parks) share the one channel without seeing each other's traffic.

@Injectable()
export class RealtimeService implements OnApplicationShutdown {

    private readonly pub = new Redis({ host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD });
    private readonly sub = new Redis({ host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD });

    private readonly scopes = new Map<Execution.Signal.Channel, RealtimeScopeImpl>();

    constructor() {
        this.sub.on("message", (channel: string, raw: string) => {
            this.scopes.get(channel as Execution.Signal.Channel)?.dispatch(raw);
        });
    }




    public async onApplicationShutdown(): Promise<void> {
        await bounded(this.disconnect(), QUIT_TIMEOUT_MS);
    }




    // Subscribing here rather than at the first park closes the window where a reply lands
    // on a channel nobody is listening to.
    public createScope(executionId: Execution.Id, workflowId: Workflow.Id): RuntimeNode.RealtimeScope {
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





    // Kept for a while so a client arriving after the run can still read it.
    public async cacheRecording(executionId: Execution.Id, recording: Execution.Recording): Promise<void> {
        await this.pub.set(
            Execution.Event.getChannel(executionId),
            JSON.stringify(recording),
            'EX', Execution.Recording.LIVE_TTL_SECONDS,
        );
    }




    // Publishes any event on its own channel.
    public async emit(event: Realtime.Event): Promise<void> {
        await this.pub.publish(event.channel, JSON.stringify(event));
    }




    // Closes both connections; the scopes they served should already be closed.
    public async disconnect(): Promise<void> {
        await Promise.allSettled([this.pub.quit(), this.sub.quit()]);
    }




    // Reopens connections that `disconnect` closed and restores any open scope's subscription.
    public async reconnect(): Promise<void> {
        await Promise.all([this.pub, this.sub]
            .filter((connection) => connection.status === 'end')
            .map((connection) => connection.connect()));

        const channels = [...this.scopes.keys()];

        if (channels.length > 0)
            await this.sub.subscribe(...channels);
    }
}
