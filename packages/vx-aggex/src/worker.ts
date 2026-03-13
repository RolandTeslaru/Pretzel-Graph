import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { EXECUTION_QUEUE_ID, REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants"
import { Orchestrator, Realtime, Workflow } from '@vx-agent-editor/shared/domain';
import { AggexEngine } from 'src/engine';
import { container, singleton } from 'tsyringe';
import { EventBuilder } from './event/builder';
import { Emitter, EmitterEvent } from './event/emitter';
import { WorkflowCompiler } from './compiler';


const TERMINATE_CHANNEL = "aggex:terminate";

@singleton()
export class AggexWorkerImpl {
    constructor() { }

    private compiler = new WorkflowCompiler();
    private runningEngines = new Map<Orchestrator.Job.Id, AggexEngine>();

    private redisPub = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })
    private redisSub = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })

    public init() {
        this.worker.run()

        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed`);
        });
        this.worker.on('failed', (job, err) => {
            console.error(`Job ${job?.id} failed:`, err);
        });

        this.redisSub.subscribe(TERMINATE_CHANNEL);
        this.redisSub.on('message', (_channel, message) => {
            const jobId = message as Orchestrator.Job.Id;
            const engine = this.runningEngines.get(jobId);
            if (engine) {
                console.log(`Terminating job ${jobId}`);
                engine.kill();
            }
        });
    }

    private processQueueItem = async (
        { data: queueItem }: { data: Orchestrator.ExecutionQueue.Item }
    ) => {
        const { workflow, jobId, executionSession } = queueItem;
        console.log("Processing Queue Item ", queueItem.jobId, " worlflow id ", queueItem.workflow.id);

        const emit: Emitter = (event: EmitterEvent) => {
            this.publishToRedis(event)
        }

        emit<Orchestrator.Event.Job.Started>({
            jobId,
            workflowId: workflow.id,
            type: "started",
            topic: Orchestrator.Event.getTopic(jobId)
        });

        const engine = new AggexEngine();
        this.runningEngines.set(jobId, engine);

        let killed = false;

        try {
            const compilationResult = await this.compiler.compile(workflow, jobId, executionSession, emit);

            const result = await engine.start(compilationResult);
            killed = result.killed;
            compilationResult.context.streamController.disposeAll();
        } catch (err) {
            console.error("Error during execution of job ", jobId, err)

            emit<Orchestrator.Event.Job.Failed>({
                jobId,
                workflowId: workflow.id,
                type: "failed",
                topic: Orchestrator.Event.getTopic(jobId),
                error: (err as Error).message
            });

            return { status: 'failed', error: (err as Error).message }
        } finally {
            this.runningEngines.delete(jobId);
        }

        if (killed) {
            return { status: 'terminated' };
        }

        emit<Orchestrator.Event.Job.Completed>({
            jobId,
            workflowId: workflow.id,
            type: "completed",
            topic: Orchestrator.Event.getTopic(jobId),
            result: "Workflow execution completed successfully"
        });

        return { status: 'completed' };
    }

    private worker = new Worker(
        EXECUTION_QUEUE_ID,
        this.processQueueItem,
        { connection: this.redisPub, autorun: false }
    )

    public async publishToRedis(event: EmitterEvent) {
        this.redisPub.publish(event.topic, JSON.stringify(event));
    }
}

export const AggexWorker = container.resolve(AggexWorkerImpl);