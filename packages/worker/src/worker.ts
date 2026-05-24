import { Job as BullJob, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants"
import { Execution, Recording, Realtime } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { AggexEngine, AggexHooks } from 'src/engine';
import { FlightRecorderService } from './engine/flight-recorder-service';
import { container, singleton } from 'tsyringe';
import { WorkflowCompiler } from './compiler';
import { AxiosService } from './axios';

const LOCK_EXTEND_INTERVAL_MS = 15_000;
const LOCK_EXTEND_DURATION_MS = 30_000;
const MAX_PAUSE_DURATION_MS = 5 * 60_000;


@singleton()
export class AggexWorkerImpl {
    constructor() { }

    private compiler = new WorkflowCompiler();  

    private runningEnginesMap           = new Map<Execution.Id, AggexEngine>();
    private runningExecutionContextsMap = new Map<Execution.Id, AggexEngine.Execution.Context>()
    private signalHandlersMap           = new Map<Execution.Signal.Channel, (signal: Execution.Signal) => void>();

    private redisPub    = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })
    private redisSub    = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })
    private redisWorker = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })

    public init() {
        this.redisSub.on("message", (ch: Execution.Signal.Channel, msg: string) => {
            const handler = this.signalHandlersMap.get(ch);
            if (!handler) return;
            const signal = JSON.parse(msg) as Execution.Signal;
            handler(signal);
        });
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
        const { workflowId, workflowData, execution, credentialInstances } = bullJob.data;
        const executionId = execution.id;
        const { igniter } = execution;
        console.log(`Processing job ${bullJob.id} for workflow ${workflowId} with execution id ${execution.id}`);

        const eventChannel  = Execution.Event.getChannel(execution.id);
        const signalChannel = Execution.Signal.getChannel(execution.id);

        this.signalHandlersMap.set(signalChannel, (signal) => this.handleSignal(signal));
        this.redisSub.subscribe(signalChannel);

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

        this.emit<Execution.Event.Started>({
            executionId: execution.id,
            workflowId,
            type: "started",
            channel: eventChannel
        });

        let recorder: FlightRecorderService | null = null;

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
                    this.emit<Execution.Event.Paused>({
                        executionId,
                        workflowId,
                        type: "paused",
                        channel: eventChannel,
                        session: executionCtx.session,
                    });
                },
                onResume: () => {
                    stopLockExtension();
                    this.emit<Execution.Event.Resumed>({
                        executionId,
                        workflowId,
                        type: "resumed",
                        channel: eventChannel,
                        session: executionCtx.session,
                    });
                },
            };

            // Create and register engine
            engine = new AggexEngine(aggexHooks);
            this.runningEnginesMap.set(executionId, engine);

            const origin = performance.now();
            recorder = new FlightRecorderService(executionId, workflowId, workflowData, origin);
            if(igniter.record)
                engine.attachFlightRecorder(recorder);

            // Compile and register execution context
            executionCtx = await this.compiler.compile(workflowId, workflowData, execution, this.emit, engine, credentialInstances);
            this.runningExecutionContextsMap.set(executionId, executionCtx);

            const result = await engine.run(executionCtx);

            const session = executionCtx.session;
            const status = result.status === 'terminated' ? 'terminated' : 'completed';

            await Execution.API.update(AxiosService.api, { executionId, status, session });

            if (status === 'terminated') {
                this.emit<Execution.Event.Terminated>({ executionId, workflowId, type: "terminated", channel: eventChannel });
            } else {
                this.emit<Execution.Event.Completed>({ executionId, workflowId, type: "completed", channel: eventChannel, session });
            }

            if(igniter.record && recorder){
                await this.redisPub.set(
                    Execution.Event.getChannel(executionId),
                    JSON.stringify(recorder.getRecording()),
                    'EX', 60 * 60 // expire in 1 hour
                )
                this.emit<Recording.Event.FullyUploaded>({
                    channel:     Execution.Event.getChannel(executionId),
                    executionId: executionId,
                    type:        "recording:fullyUploaded",
                })
            }

            return { status };

        } catch (err: unknown) {
            const systemError = SystemError.fromUnknown(err)

            console.error("Error during execution of job", execution.id, systemError.message, systemError.detail || "");

            const executionCtx = this.runningExecutionContextsMap.get(execution.id)!;
            const session = executionCtx?.session ?? Execution.Session.createInitial();

            await Execution.API.update(AxiosService.api, { executionId: execution.id, status: 'failed', session }).catch(() => {});

            if (recorder) {
                await Recording.API.upsert(AxiosService.api, { recording: recorder.getRecording() })
                    .catch(saveErr => console.error('[Worker] Failed to save recording:', saveErr));
            }

            this.emit<Execution.Event.Failed>({
                executionId: execution.id,
                workflowId,
                type: "failed",
                channel: eventChannel,
                error: systemError.toJSON(),
                session,
            });

            return { status: 'failed', error: systemError.toJSON() };

        } finally {
            stopLockExtension();
            console.log("Deleting job", execution.id, "from running engines and contexts")

            this.runningEnginesMap.delete(execution.id);
            this.runningExecutionContextsMap.delete(execution.id);
            this.signalHandlersMap.delete(signalChannel);
            this.redisSub.unsubscribe(signalChannel);
        }
    }

    private worker = new Worker(Execution.Queue.ID, this.processQueueItem, { connection: this.redisWorker, autorun: false }
    )


    public emit = <T_Event extends Realtime.Event>(event: T_Event) => {
        this.redisPub.publish(event.channel, JSON.stringify(event));
    }
}

export const AggexWorker = container.resolve(AggexWorkerImpl);
