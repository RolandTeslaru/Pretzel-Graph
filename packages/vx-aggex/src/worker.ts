import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { EXECUTION_QUEUE_ID, REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants"
import { Orchestrator, Realtime, Workflow } from '@vx-agent-editor/shared/domain';
import { AggexEngine } from 'src/engine';
import { container, singleton } from 'tsyringe';
import { EventBuilder } from './eventBuilder';
import { Runtime } from './runtime';


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
        const { workflow, jobId, state: initialState } = queueItem;

        const eventBuilder = new EventBuilder(
            jobId,
            workflow.id,
            `job:${jobId}:events` as Realtime.Topic.Id
        )

        const emit: Runtime.Emitter = (builderFn) => {
            this.publishToRedis(builderFn(eventBuilder))
        }

        emit(b => b.started());

        const { compiledGraph, state } = await this.engine.compile(workflow, emit)

        for await (const payload of this.engine.stream(compiledGraph, state)) {
            switch (payload.mode) {
                case "messages":
                    emit(b => b.messageChunk(payload.nodeId, payload.content));
                    break
                case "conversation":
                    emit(b => b.conversationChunk(payload.nodeId, payload.content));
                    break
                case "updates":
                    emit(b => b.update(payload.update as any))
                    break
                case "values":
                    break;
            }
        }

        emit(builder => builder.completed(""))

        return { status: 'completed' };
    }

    private worker = new Worker(
        EXECUTION_QUEUE_ID,
        this.processQueueItem,
        { connection: this.redis, autorun: false }
    )

    public async publishToRedis(event: Orchestrator.Event) {
        this.redis.publish(event.topicId, JSON.stringify(event));
    }
}

export const AggexWorker = container.resolve(AggexWorkerImpl);