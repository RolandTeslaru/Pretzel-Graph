import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { EXECUTION_QUEUE_ID, REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants"
import { Orchestrator } from '@vx-agent-editor/shared/types';
import { AggexEngine } from 'src/engine';
import { Realtime } from '@vx-agent-editor/shared/types/Realtime';
import { container, singleton } from 'tsyringe';

@singleton()
export class AggexWorkerImpl {
    constructor() { }

    public init() {
        this.worker.run()

        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed`);
        });
        this.worker.on('failed', (job, err) => {
            console.error(`Job ${job?.id} failed:`, err);
        });

    }
    private engine = new AggexEngine();
    private redis = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })

    private processQueueItem = async (
        { data: queueItem }: { data: Orchestrator.ExecutionQueue.Item }
    ) => {
        console.log("Processing Queue Item ", queueItem.jobId, " worlflow id ", queueItem.workflow.id)
        const { workflow, jobId } = queueItem;
        const payloadMeta = { jobId: jobId, workflowId: workflow.id}

        const topicId = `job:${jobId}:events` as Realtime.Topic.Id

        const startEvent: Orchestrator.Event.Job.Started = {
            type: "job:started",
            topicId,
            payload: {...payloadMeta},
            timestamp: Date.now()
        }

        await this.emit(startEvent)

        const compiledGraph = await this.engine.compile(workflow)


        for await (const update of await this.engine.stream(compiledGraph, {})) {
            await this.emit({
                type: "job:update",
                topicId,
                payload: { update, ...payloadMeta },
                timestamp: Date.now()
            } satisfies Orchestrator.Event.Job.Update);
        }

        await this.emit({
            type: "job:completed",
            topicId,
            payload: { ...payloadMeta },
            timestamp: Date.now()
        } as Orchestrator.Event.Job.Completed)

        return { status: 'completed' };
    }

    private worker = new Worker(
        EXECUTION_QUEUE_ID,
        this.processQueueItem,
        { connection: this.redis, autorun: false }
    )

    public async emit(event: Realtime.Event) {
        this.redis.publish(event.topicId, JSON.stringify(event));
    }
}

export const AggexWorker = container.resolve(AggexWorkerImpl);