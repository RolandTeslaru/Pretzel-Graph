import { Job as BullJob, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from "@pretzel-graph/shared/constants"
import { Execution } from '@pretzel-graph/shared/domain';
import { ConnectionManager } from '@pretzel-graph/node-sdk';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { AggexEngine, AggexHooks } from 'src/engine';
import { FlightRecorderService } from './engine/flight-recorder-service';
import { container, singleton } from 'tsyringe';
import { TurboGraph } from './turboGraph';
import { createInternalClient } from './turboGraph/http';
import { AirlockService } from './airlock';
import { AxiosService } from './axios';
import { SharedRealtimeService } from './realtime';

const LOCK_EXTEND_INTERVAL_MS = 15_000;
const LOCK_EXTEND_DURATION_MS = 30_000;
const MAX_PAUSE_DURATION_MS = 5 * 60_000;


@singleton()
export class AggexWorkerImpl {
    constructor() { }

    private compiler = new TurboGraph();

    private runningEnginesMap           = new Map<Execution.Id, AggexEngine>();
    private runningExecutionContextsMap = new Map<Execution.Id, AggexEngine.Execution.Context>()

    // Recording cache only — publishing goes through the realtime scope.
    private redisPub    = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD, maxRetriesPerRequest: null })
    private redisWorker = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD, maxRetriesPerRequest: null })

    private realtime    = new SharedRealtimeService()

    public init() {
        this.worker.run()
    }

    private pauseTimeoutResetters = new Map<Execution.Id, () => void>();

    private handleSignal(signal: Execution.Signal) {
        const engine = this.runningEnginesMap.get(signal.executionId);
        const ctx = this.runningExecutionContextsMap.get(signal.executionId);
        if (!ctx) return;

        switch (signal.type) {
            case "terminate":
                ctx.abortAPI.abort()
                break;
            case "pause":
                engine?.pause();
                break;
            case "resume":
                engine?.resume();
                break;
            case "suspend":
                ctx.abortAPI.abort();
                break;
            case "heartbeat":
                this.pauseTimeoutResetters.get(signal.executionId)?.();
                break;
        }
    }

    private processQueueItem = async (
        bullJob: BullJob<Execution.Queue.Item>,
        token?: string
    ) => {
        const { workflowId, workflowData, execution, credentialInstances, executionToken } = bullJob.data;
        const executionId = execution.id;
        const { igniter } = execution;

        // We hold no signing key, so this cannot prove the token is genuine — it only stops a
        // forged queue item from pointing the run at one execution and the nodes at another.
        const claims = Execution.Token.decodeUnverified(executionToken);

        if (claims?.executionId !== executionId)
            throw new SystemError(
                SystemError.Code.INFRA_QUEUE_ERROR,
                `Execution token does not match queued execution ${executionId}`
            );

        console.log(`Processing job ${bullJob.id} for workflow ${workflowId} with execution id ${execution.id}`);

        // Subscribed for the whole job, so nothing can reply into a gap. Everything this
        // execution emits or awaits goes through here.
        const scope = this.realtime.scope(executionId, workflowId);
        const unsubscribeFromLifecycleSignals = scope.onSignal(Execution.Signal.Schema, signal => this.handleSignal(signal));

        let lockExtendInterval: ReturnType<typeof setInterval> | null = null;
        let pauseTimeout: ReturnType<typeof setTimeout> | null = null;

        const startPauseTimeout = (onTimeout: () => void) => {
            if (pauseTimeout) clearTimeout(pauseTimeout);
            pauseTimeout = setTimeout(onTimeout, MAX_PAUSE_DURATION_MS);
        };

        const startLockExtension = () => {
            if (lockExtendInterval || !token) return;
            lockExtendInterval = setInterval(async () => {
                try {
                    await bullJob.extendLock(token, LOCK_EXTEND_DURATION_MS);
                } catch (err) {
                    console.error(`[Worker] Failed to extend lock for execution ${execution.id}:`, err);
                }
            }, LOCK_EXTEND_INTERVAL_MS);
        };

        const stopLockExtension = () => {
            if (lockExtendInterval) {
                clearInterval(lockExtendInterval);
                lockExtendInterval = null;
            }
            if (pauseTimeout) {
                clearTimeout(pauseTimeout);
                pauseTimeout = null;
            }
            this.pauseTimeoutResetters.delete(execution.id);
        };

        scope.emit(Execution.Event.create("lifecycle:started"));

        let recorder: FlightRecorderService | null = null;
        // One Isolate per execution = the tenant/security boundary. Owned here (outermost),
        // passed by ref into the compiler, and disposed in `finally`.
        const airlock = new AirlockService();
        const origin = performance.now();

        try {
            let executionCtx!: AggexEngine.Execution.Context;
            let engine!: AggexEngine;

            const onPauseTimeout = () => {
                console.log(`[Worker] Max pause duration reached for job ${bullJob.id}, terminating`);
                executionCtx.abortAPI.abort()
                engine.resume();
            };

            const aggexHooks: AggexHooks = {
                onPause: () => {
                    startLockExtension();
                    startPauseTimeout(onPauseTimeout);
                    this.pauseTimeoutResetters.set(executionId, () => startPauseTimeout(onPauseTimeout));
                    scope.emit(Execution.Event.create("lifecycle:paused", {
                        session: executionCtx.session,
                    }));
                },
                onResume: () => {
                    stopLockExtension();
                    scope.emit(Execution.Event.create("lifecycle:resumed", {
                        session: executionCtx.session,
                    }));
                },
            };

            // Create and register engine
            engine = new AggexEngine(aggexHooks);
            this.runningEnginesMap.set(executionId, engine);

            recorder = new FlightRecorderService(executionId, workflowId, workflowData, origin);
            if(igniter.record)
                engine.attachFlightRecorder(recorder);

            // Backend internal routes, authenticated as THIS execution. Deliberately built
            // here rather than from httpClientFactory: that binds the node's proxy credential,
            // which would send the token through a user-configured proxy.
            const internalAPI = createInternalClient(executionToken);

            // Compile and register execution context
            executionCtx = await this.compiler.compile(workflowId, workflowData, execution, scope, engine, airlock, credentialInstances, internalAPI);
            this.runningExecutionContextsMap.set(executionId, executionCtx);

            const result = await engine.run(executionCtx);

            const session = executionCtx.session;
            const status = result.status === 'terminated' ? 'terminated' : 'completed';
            const recording = (igniter.record && recorder) ? recorder.getRecording() : null;
            const duration = performance.now() - origin;

            await Execution.API.update(AxiosService.api, { executionId, status, duration, session, recording });

            if (status === 'terminated')
                scope.emit(Execution.Event.create("lifecycle:terminated"));
            else
                scope.emit(Execution.Event.create("lifecycle:completed", { session }));

            if (recording) {
                await this.redisPub.set(
                    Execution.Event.getChannel(executionId),
                    JSON.stringify(recording),
                    'EX', Execution.Recording.LIVE_TTL_SECONDS,
                )
                scope.emit(Execution.Event.create("recording:fullyUploaded"))
            }

            return { status };

        } catch (err: unknown) {
            const systemError = SystemError.fromUnknown(err)

            console.error("Error during execution of job", execution.id, systemError.message, systemError.detail || "");

            const executionCtx = this.runningExecutionContextsMap.get(execution.id)!;
            const session = executionCtx?.session ?? Execution.Session.createInitial();
            const recording = (igniter.record && recorder) ? recorder.getRecording() : null;
            const duration = performance.now() - origin;

            await Execution.API.update(AxiosService.api, { executionId: execution.id, status: 'failed', duration, session, recording }).catch(() => {});

            scope.emit(Execution.Event.create("lifecycle:failed", {
                error: systemError.toJSON(),
                session,
            }));

            if (recording) {
                await this.redisPub.set(
                    Execution.Event.getChannel(execution.id),
                    JSON.stringify(recording),
                    'EX', Execution.Recording.LIVE_TTL_SECONDS,
                ).catch(redisErr => console.error('[Worker] Failed to cache recording:', redisErr));
                scope.emit(Execution.Event.create("recording:fullyUploaded"))
            }

            return { status: 'failed', error: systemError.toJSON() };

        } finally {
            stopLockExtension();
            console.log("Deleting job", execution.id, "from running engines and contexts")

            airlock.dispose();   // free the isolate + all its contexts/scripts
            this.runningEnginesMap.delete(execution.id);
            this.runningExecutionContextsMap.delete(execution.id);

            // unsubscribeFromLifecycleSignals();
            scope.close();   // unsubscribes and rejects anything still parked (including lifecycle signals)
        }
    }

    private shuttingDown = false;

    /**
     * The TERM window is the platform's grace period, so every step is bounded.
     * An active job that cannot finish in time goes back locked and surfaces as
     * failed when the lease expires — never silently re-run.
     */
    public async shutdown(): Promise<void> {
        if (this.shuttingDown)
            return;

        this.shuttingDown = true;

        console.log('[Worker] Shutting down: closing queue, pools, redis');

        const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 4_000));
        const closed  = await Promise.race([this.worker.close().then(() => 'closed' as const), timeout]);

        if (closed === 'timeout')
            await this.worker.close(true).catch(() => {});

        // Customer-database pools flush and disconnect, so the servers on the
        // other end see a close instead of a vanished peer.
        await ConnectionManager.purgeAll();

        await Promise.allSettled([this.redisPub.quit(), this.redisWorker.quit()]);

        // Flushed, not console.log: stdout to a pipe is async and exit() would
        // drop whatever is still buffered.
        await new Promise<void>((resolve) => process.stdout.write('[Worker] Shutdown complete\n', () => resolve()));

        process.exit(0);
    }

    private worker = new Worker(Execution.Queue.ID, this.processQueueItem, {
        connection: this.redisWorker,
        autorun: false,
        // Synchronous expression evaluation can hold the event loop for minutes,
        // starving lock renewal. The lease must outlast the longest legal stretch,
        // or a running job is declared stalled and handed out again mid-run.
        lockDuration:    5 * 60_000,
        stalledInterval: 5 * 60_000,
        // A stalled job may have already produced side effects. Fail it visibly
        // rather than re-running it; a re-run is the caller's decision.
        maxStalledCount: 0,
    })
}

export const AggexWorker = container.resolve(AggexWorkerImpl);
