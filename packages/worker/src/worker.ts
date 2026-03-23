import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants"
import { Orchestrator } from '@vx-agent-editor/shared/domain';
import { SysError } from '@vx-agent-editor/shared/domain/SysError';
import { AggexEngine } from 'src/engine';
import { container, singleton } from 'tsyringe';
import { Emitter, EmitterEvent } from './event/emitter';
import { WorkflowCompiler } from './compiler';
import { ExecutionContext } from './context';


@singleton()
export class AggexWorkerImpl {
    constructor() { }

    private compiler = new WorkflowCompiler();
    private runningEngines = new Map<Orchestrator.Job.Id, AggexEngine>();
    private runningExecutionContexts = new Map<Orchestrator.Job.Id, ExecutionContext>()

    private redisPub = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })
    private redisSub = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })
    private redisWorker = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })

    public init() {
        this.worker.run()
    }

    private handleSignal(signal: Orchestrator.Signal) {
        const ctx = this.runningExecutionContexts.get(signal.jobId);
        if (!ctx) return;

        switch (signal.type) {
            case "terminate":
                ctx.abortController.abort();
                break;
            case "pause":
                break;
            case "resume":
                break;
        }
    }

    private processQueueItem = async (
        { data: queueItem }: { data: Orchestrator.ExecutionQueue.Item }
    ) => {
        const { workflow, jobId, executionSession } = queueItem;
        console.log("Processing Queue Item", jobId, "workflow id", workflow.id, "execution session id:", executionSession.id);

        const signalChannel = Orchestrator.Signal.getChannel(jobId);
        const eventChannel = Orchestrator.Event.getChannel(jobId);

        this.emit<Orchestrator.Event.Started>({
            jobId,
            workflowId: workflow.id,
            type: "started",
            channel: eventChannel
        });

        try {
            const compilationResult = await this.compiler.compile(workflow, jobId, executionSession, this.emit);
            const context = compilationResult.context;

            this.redisSub.subscribe(signalChannel);
            this.redisSub.on("message", (ch, msg) => {
                if (ch !== signalChannel) return;
                const signal = JSON.parse(msg) as Orchestrator.Signal;
                this.handleSignal(signal);
            });

            const engine = new AggexEngine(compilationResult);
            this.runningEngines.set(jobId, engine);
            this.runningExecutionContexts.set(jobId, context);

            let engineError: Error | null = null;

            const enginePromise = engine.run().catch((err) => {
                engineError = err instanceof Error ? err : new Error(String(err));
            });

            const result = await Promise.race([
                enginePromise.then(() => 'completed' as const),
                new Promise<'terminated'>((resolve) => {
                    context.abortController.signal.addEventListener('abort', () => resolve('terminated'), { once: true });
                })
            ]);

            context.streamController.disposeAll();

            if (result === 'terminated') {
                this.emit<Orchestrator.Event.Terminated>({
                    jobId,
                    workflowId: workflow.id,
                    type: "terminated",
                    channel: eventChannel,
                });
                return { status: 'terminated' };
            }

            if (engineError) {
                throw engineError;
            }

            this.emit<Orchestrator.Event.Completed>({
                jobId,
                workflowId: workflow.id,
                type: "completed",
                channel: eventChannel,
                result: "Workflow execution completed successfully"
            });
            return { status: 'completed' };

        } catch (err) {
            console.error("Error during execution of job", jobId, err);

            const sysError = SysError.fromUnknown(err)

            this.emit<Orchestrator.Event.Failed>({
                jobId,
                workflowId: workflow.id,
                type: "failed",
                channel: eventChannel,
                error: sysError.toJSON()
            });
            return { status: 'failed', error: sysError.toJSON() };

        } finally {
            console.log("Deleting job", jobId, "from running engines and contexts")

            this.runningEngines.delete(jobId);
            this.runningExecutionContexts.delete(jobId);
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