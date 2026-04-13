import { Job as BullJob, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants"
import { Orchestrator } from '@vx-agent-editor/shared/domain';
import { SystemError } from '@vx-agent-editor/shared/domain/SystemError';
import { AggexEngine, AggexHooks } from 'src/engine';
import { container, singleton } from 'tsyringe';
import { Emitter, EmitterEvent } from './event/emitter';
import { WorkflowCompiler } from './compiler';
import { ExecutionContext } from './context';

const LOCK_EXTEND_INTERVAL_MS = 15_000;
const LOCK_EXTEND_DURATION_MS = 30_000;
const MAX_PAUSE_DURATION_MS = 5 * 60_000;


@singleton()
export class AggexWorkerImpl {
    constructor() { }

    private compiler = new WorkflowCompiler();
    private runningEngines = new Map<Orchestrator.Job.Id, AggexEngine>();
    private runningExecutionContexts = new Map<Orchestrator.Job.Id, ExecutionContext>()
    private signalHandlers = new Map<string, (signal: Orchestrator.Signal) => void>();

    private redisPub = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })
    private redisSub = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })
    private redisWorker = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })

    public init() {
        this.redisSub.on("message", (ch, msg) => {
            const handler = this.signalHandlers.get(ch);
            if (!handler) return;
            const signal = JSON.parse(msg) as Orchestrator.Signal;
            handler(signal);
        });
        this.worker.run()
    }

    private pauseTimeoutResetters = new Map<Orchestrator.Job.Id, () => void>();

    private handleSignal(signal: Orchestrator.Signal) {
        const engine = this.runningEngines.get(signal.jobId);
        const ctx = this.runningExecutionContexts.get(signal.jobId);
        if (!ctx) return;

        switch (signal.type) {
            case "terminate":
                ctx.abortController.abort();
                break;
            case "pause":
                engine?.pause();
                break;
            case "resume":
                engine?.resume();
                break;
            case "suspend":
                ctx.abortController.abort();
                break;
            case "heartbeat":
                this.pauseTimeoutResetters.get(signal.jobId)?.();
                break;
        }
    }

    private processQueueItem = async (
        bullJob: BullJob<Orchestrator.ExecutionQueue.Item>,
        token?: string
    ) => {
        const { workflow, jobId, executionSession } = bullJob.data;
        console.log("Processing Queue Item", jobId, "workflow id", workflow.id, "execution session id:", executionSession.id);

        const signalChannel = Orchestrator.Signal.getChannel(jobId);
        const eventChannel = Orchestrator.Event.getChannel(jobId);

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
                    console.error(`[Worker] Failed to extend lock for job ${jobId}:`, err);
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
            this.pauseTimeoutResetters.delete(jobId);
        };

        console.log(`[Worker] Emitting 'started' for job ${jobId} at ${Date.now()}`);
        this.emit<Orchestrator.Event.Started>({
            jobId,
            workflowId: workflow.id,
            type: "started",
            channel: eventChannel
        });

        try {
            const compilationResult = await this.compiler.compile(workflow, jobId, executionSession, this.emit);
            const context = compilationResult.context;

            this.signalHandlers.set(signalChannel, (signal) => this.handleSignal(signal));
            this.redisSub.subscribe(signalChannel);

            const onPauseTimeout = () => {
                console.log(`[Worker] Max pause duration reached for job ${jobId}, terminating`);
                context.abortController.abort();
                engine.resume();
            };

            const aggexHooks: AggexHooks = {
                onPause: () => {
                    startLockExtension();
                    startPauseTimeout(onPauseTimeout);
                    this.pauseTimeoutResetters.set(jobId, () => startPauseTimeout(onPauseTimeout));
                    this.emit<Orchestrator.Event.Paused>({
                        jobId,
                        workflowId: workflow.id,
                        type: "paused",
                        channel: eventChannel,
                    });
                },
                onResume: () => {
                    stopLockExtension();
                    this.emit<Orchestrator.Event.Resumed>({
                        jobId,
                        workflowId: workflow.id,
                        type: "resumed",
                        channel: eventChannel,
                    });
                },
            };

            const engine = new AggexEngine(compilationResult, aggexHooks);
            this.runningEngines.set(jobId, engine);
            this.runningExecutionContexts.set(jobId, context);

            const result = await engine.run();

            context.streamController.disposeAll();

            if (result.status === 'terminated')
                this.emit<Orchestrator.Event.Terminated>({
                    jobId,
                    workflowId: workflow.id,
                    type: "terminated",
                    channel: eventChannel,
                });
            else if (result.status === "completed" )
                this.emit<Orchestrator.Event.Completed>({
                    jobId,
                    workflowId: workflow.id,
                    type: "completed",
                    channel: eventChannel,
                    result: "Workflow execution completed successfully"
                });

            return { status: result.status };

        } catch (err: unknown) {
            const systemError = SystemError.fromUnknown(err)

            console.error("Error during execution of job", jobId, systemError.message, systemError.detail || "");

            this.emit<Orchestrator.Event.Failed>({
                jobId,
                workflowId: workflow.id,
                type: "failed",
                channel: eventChannel,
                error: systemError.toJSON()
            });
            
            return { status: 'failed', error: systemError.toJSON() };

        } finally {
            stopLockExtension();
            console.log("Deleting job", jobId, "from running engines and contexts")

            this.runningEngines.delete(jobId);
            this.runningExecutionContexts.delete(jobId);
            this.signalHandlers.delete(signalChannel);
            this.redisSub.unsubscribe(signalChannel);
        }
    }

    private worker = new Worker(
        Orchestrator.EXECUTION_QUEUE_ID,
        this.processQueueItem,
        { connection: this.redisWorker, autorun: false }
    )


    public emit: Emitter = (event: EmitterEvent) => {
        this.publishToRedis(event)
    }

    public async publishToRedis(event: EmitterEvent) {
        this.redisPub.publish(event.channel, JSON.stringify(event));
    }
}

export const AggexWorker = container.resolve(AggexWorkerImpl);