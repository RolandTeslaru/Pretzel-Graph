import { Job as BullJob, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants"
import { Execution, Realtime } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { AggexEngine, AggexHooks } from 'src/engine';
import { container, singleton } from 'tsyringe';
import { WorkflowCompiler } from './compiler';

const LOCK_EXTEND_INTERVAL_MS = 15_000;
const LOCK_EXTEND_DURATION_MS = 30_000;
const MAX_PAUSE_DURATION_MS = 5 * 60_000;


@singleton()
export class AggexWorkerImpl {
    constructor() { }

    private compiler = new WorkflowCompiler();  

    private runningEngines           = new Map<Execution.Id, AggexEngine>();
    private runningExecutionContexts = new Map<Execution.Id, AggexEngine.ExecutionContext>()
    private signalHandlers           = new Map<Execution.Signal.Channel, (signal: Execution.Signal) => void>();

    private redisPub    = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })
    private redisSub    = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })
    private redisWorker = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })

    public init() {
        this.redisSub.on("message", (ch: Execution.Signal.Channel, msg: string) => {
            const handler = this.signalHandlers.get(ch);
            if (!handler) return;
            const signal = JSON.parse(msg) as Execution.Signal;
            handler(signal);
        });
        this.worker.run()
    }

    private pauseTimeoutResetters = new Map<Execution.Id, () => void>();

    private handleSignal(signal: Execution.Signal) {
        const engine = this.runningEngines.get(signal.executionId);
        const ctx = this.runningExecutionContexts.get(signal.executionId);
        if (!ctx) return;

        switch (signal.type) {
            case "terminate":
                ctx.abortExecution()
                break;
            case "pause":
                engine?.pause();
                break;
            case "resume":
                engine?.resume();
                break;
            case "suspend":
                ctx.abortExecution();
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
        const { workflowId, workflowData, execution } = bullJob.data;
        const executionId = execution.id;
        console.log(`Processing job ${bullJob.id} for workflow ${workflowId} with execution id ${execution.id}`);

        const eventChannel  = Execution.Event.getChannel(execution.id);
        const signalChannel = Execution.Signal.getChannel(execution.id);

        this.signalHandlers.set(signalChannel, (signal) => this.handleSignal(signal));
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

        try {
            const engineExecutionCtx = await this.compiler.compile(workflowId, workflowData, execution, this.emit);

            const onPauseTimeout = () => {
                console.log(`[Worker] Max pause duration reached for job ${bullJob.id}, terminating`);
                engineExecutionCtx.abortExecution()
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
                    });
                },
                onResume: () => {
                    stopLockExtension();
                    this.emit<Execution.Event.Resumed>({
                        executionId,
                        workflowId,
                        type: "resumed",
                        channel: eventChannel,
                    });
                },
            };

            const engine = new AggexEngine(aggexHooks);
            this.runningEngines.set(executionId, engine);
            this.runningExecutionContexts.set(executionId, engineExecutionCtx);

            const result = await engine.run(engineExecutionCtx);

            if (result.status === 'terminated')
                this.emit<Execution.Event.Terminated>({
                    executionId,
                    workflowId,
                    type: "terminated",
                    channel: eventChannel,
                });
            else if (result.status === "completed" )
                this.emit<Execution.Event.Completed>({
                    executionId,
                    workflowId,
                    type: "completed",
                    channel: eventChannel,
                    result: "Workflow execution completed successfully"
                });

            return { status: result.status };

        } catch (err: unknown) {
            const systemError = SystemError.fromUnknown(err)

            console.error("Error during execution of job", execution.id, systemError.message, systemError.detail || "");

            this.emit<Execution.Event.Failed>({
                executionId: execution.id,
                workflowId,
                type: "failed",
                channel: eventChannel,
                error: systemError.toJSON()
            });
            
            return { status: 'failed', error: systemError.toJSON() };

        } finally {
            stopLockExtension();
            console.log("Deleting job", execution.id, "from running engines and contexts")

            this.runningEngines.delete(execution.id);
            this.runningExecutionContexts.delete(execution.id);
            this.signalHandlers.delete(signalChannel);
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