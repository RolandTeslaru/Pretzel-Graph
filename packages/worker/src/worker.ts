import { Job as BullJob, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from "@pretzel-graph/shared/constants"
import { Execution, Worker as WorkerD } from '@pretzel-graph/shared/domain';
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

// Total budget ~10s, within the stop grace period.
const CLOSE_TIMEOUT_MS   = 4_000;
const FORCE_TIMEOUT_MS   = 2_000;
const ABANDON_TIMEOUT_MS =   500;
const PURGE_TIMEOUT_MS   = 3_000;
const QUIT_TIMEOUT_MS    = 1_000;

const bounded = <T>(work: Promise<T>, ms: number): Promise<T | 'timeout'> => {
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms));

    return Promise.race([work, timeout]);
};


@singleton()
export class AggexWorkerImpl {
    constructor() { }

    private compiler = new TurboGraph();

    private runningEnginesMap           = new Map<Execution.Id, AggexEngine>();
    private runningExecutionContextsMap = new Map<Execution.Id, AggexEngine.Execution.Context>()

    // Recording cache only; publishing goes through the realtime scope.
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

        // Unverified: only guards against a token/execution mismatch.
        const claims = Execution.Token.decodeUnverified(executionToken);

        if (claims?.executionId !== executionId)
            throw new SystemError(
                SystemError.Code.INFRA_QUEUE_ERROR,
                `Execution token does not match queued execution ${executionId}`
            );

        console.log(`Processing job ${bullJob.id} for workflow ${workflowId} with execution id ${execution.id}`);

        // Scope lives for the whole job; all emits/awaits go through it.
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

        await Execution.API.update(AxiosService.api, { executionId, status: 'running' }).catch(() => {});

        let recorder: FlightRecorderService | null = null;
        // One isolate per execution; disposed in `finally`.
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

            engine = new AggexEngine(aggexHooks);
            this.runningEnginesMap.set(executionId, engine);

            recorder = new FlightRecorderService(executionId, workflowId, workflowData, origin);
            if(igniter.record)
                engine.attachFlightRecorder(recorder);

            // Not from httpClientFactory: that would route the token through a node proxy.
            const internalAPI = createInternalClient(executionToken);

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

            airlock.dispose();
            this.runningEnginesMap.delete(execution.id);
            this.runningExecutionContextsMap.delete(execution.id);

            scope.close();
        }
    }

    private shuttingDown = false;

    // Every step is bounded so shutdown fits the TERM grace period.
    public async shutdown(): Promise<void> {
        if (this.shuttingDown)
            return;

        this.shuttingDown = true;

        console.log('[Worker] Shutting down: closing queue, pools, redis');

        // Announce running executions before anything that can block.
        const running = [...this.runningExecutionContextsMap.keys()];

        if (running.length > 0) {
            const channel = WorkerD.Event.getChannel();

            const event: WorkerD.Event.ShuttingDown = {
                type:         'worker:shutting-down',
                channel,
                executionIds: running,
            };

            await bounded(this.redisPub.publish(channel, JSON.stringify(event)), ABANDON_TIMEOUT_MS);
        }

        const closed = await bounded(this.worker.close().then(() => 'closed' as const), CLOSE_TIMEOUT_MS);

        if (closed === 'timeout')
            await bounded(this.worker.close(true).catch(() => {}), FORCE_TIMEOUT_MS);

        await bounded(ConnectionManager.purgeAll(), PURGE_TIMEOUT_MS);

        await bounded(Promise.allSettled([this.redisPub.quit(), this.redisWorker.quit()]), QUIT_TIMEOUT_MS);

        this.redisPub.disconnect();
        this.redisWorker.disconnect();

        // Flush stdout before exit.
        await new Promise<void>((resolve) => process.stdout.write('[Worker] Shutdown complete\n', () => resolve()));

        process.exit(0);
    }

    private worker = new Worker(Execution.Queue.ID, this.processQueueItem, {
        connection: this.redisWorker,
        autorun: false,
        concurrency: Number(process.env.EXECUTION_CONCURRENCY ?? 5),
        // Lease must outlast long synchronous evaluation or the job is marked stalled.
        lockDuration:    5 * 60_000,
        stalledInterval: 5 * 60_000,
        // Never re-run a stalled job; fail it visibly.
        maxStalledCount: 0,
    })
}

export const AggexWorker = container.resolve(AggexWorkerImpl);
