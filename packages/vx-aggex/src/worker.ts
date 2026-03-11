import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { EXECUTION_QUEUE_ID, REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants"
import { Orchestrator, Realtime, Workflow } from '@vx-agent-editor/shared/domain';
import { AggexEngine } from 'src/engine';
import { container, singleton } from 'tsyringe';
import { EventBuilder } from './event/builder';
import { Emitter, EmitterEvent } from './event/emitter';
import { Synthesizer } from './synthesizer';
import { WorkflowCompiler } from './compiler';


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
    private compiler = new WorkflowCompiler();

    private redis = new IORedis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null })

    private processQueueItem = async (
        { data: queueItem }: { data: Orchestrator.ExecutionQueue.Item }
    ) => {
        const { workflow, jobId, executionSession } = queueItem;
        console.log("Processing Queue Item ", queueItem.jobId, " worlflow id ", queueItem.workflow.id);

        const emit: Emitter = (event: EmitterEvent) => {
            this.publishToRedis(event)
        }

        emit({
            jobId,
            workflowId: workflow.id,
            type: "started",
            topic: Orchestrator.Event.getTopic(jobId)
        } satisfies Orchestrator.Event.Job.Started);



        try {
            const { compiledGraph, context } = await this.compiler.compile(workflow, jobId, executionSession, AggexEngine.runNode, emit);
    
            await this.engine.start(compiledGraph, context);
            context.streamController.disposeAll();
        } catch (err) {
            console.error("Error during execution of job ", jobId, err)

            emit({
                jobId,
                workflowId: workflow.id,
                type: "failed",
                topic: Orchestrator.Event.getTopic(jobId),
                error: (err as Error).message
            } satisfies Orchestrator.Event.Job.Failed);

            return { status: 'failed', error: (err as Error).message }
        }

        emit({
            jobId,
            workflowId: workflow.id,
            type: "completed",
            topic: Orchestrator.Event.getTopic(jobId),
            result: "Workflow execution completed successfully"
        } satisfies Orchestrator.Event.Job.Completed);

        return { status: 'completed' };
    }

    private worker = new Worker(
        EXECUTION_QUEUE_ID,
        this.processQueueItem,
        { connection: this.redis, autorun: false }
    )

    public async publishToRedis(event: EmitterEvent) {
        this.redis.publish(event.topic, JSON.stringify(event));
    }
}

export const AggexWorker = container.resolve(AggexWorkerImpl);