import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { EXECUTION_QUEUE_ID, REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants"
import { Orchestrator } from '@vx-agent-editor/shared/types';
import { AggexEngine } from 'src/engine';
import { Realtime } from '@vx-agent-editor/shared/types/Realtime';


export class AggexWorkerImpl {
    private constructor() { }

    public init() {
        this.worker.run()

        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed`);
        });
        this.worker.on('failed', (job, err) => {
            console.error(`Job ${job?.id} failed:`, err);
        });

    }

    public static Instance = new AggexWorkerImpl();

    private redis = new IORedis({ host: REDIS_HOST, port: REDIS_PORT })

    private processQueueItem = async (
        { data: queueItem }: { data: Orchestrator.ExecutionQueue.Item }
    ) => {
        const { workflow, jobId } = queueItem;

        const topicId = `job:${jobId}:events` as Realtime.Topic.Id

        const startEvent: Orchestrator.Event.Job.Started = {
            type: "job:started",
            topicId,
            payload: { jobId, workflowId: workflow.id },
            timestamp: Date.now()
        }

        await this.emit(startEvent)

        const engineInstance = new AggexEngine(workflow);

        for await (const event of await engineInstance.stream({})) {
            // Publish progress to Redis PubSub
            await this.emit(event);
        }

        await this.emit({
            type: "job:completed",
            topicId,
            payload: { jobId, workflowId: workflow.id },
            timestamp: Date.now()
        } as Orchestrator.Event.Job.Completed)

        return { status: 'completed' };
    }

    private worker = new Worker(
        EXECUTION_QUEUE_ID,
        this.processQueueItem,
        { connection: this.redis }
    )

    public async emit(event: Realtime.Event) {
        this.redis.publish(event.topicId, JSON.stringify(event));
    }
}

export const AggexWorker = AggexWorkerImpl.Instance   