import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, forwardRef } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Execution, Worker } from '@pretzel-graph/shared/domain';
import { CloudService } from '../Cloud/cloud.service';
import { ExecutionService } from '../Execution/execution.service';
import { RealtimeService } from '../Realtime/realtime.service';

// How long a woken worker may take to connect before it is woken again.
const WAKE_GRACE_MS = 60_000;

// How long a worker may sit idle before it is stopped.
const IDLE_MS = 20 * 60_000;

// The workers this backend drives; empty when it runs executions itself.
const WORKER_IDS = (process.env.WORKER_IDS ?? '')
    .split(',')
    .filter((workerId) => workerId.length > 0)
    .map((workerId) => Worker.Id.parse(workerId));

// Executions one worker runs at once.
const EXECUTION_CONCURRENCY = Number(process.env.EXECUTION_CONCURRENCY ?? 5);

// A named worker's queue connection is `<queue>:w:<name>`.
const WORKER_NAME_SEPARATOR = ':w:';

// Wakes workers before work is enqueued and stops each one after it goes idle.
@Injectable()
export class WorkerLifecycleService implements OnModuleInit, OnModuleDestroy {

    private readonly logger = new Logger(WorkerLifecycleService.name);

    // When each worker was last asked to wake.
    private readonly wakeRequestedAt = new Map<Worker.Id, number>();

    // Each worker's countdown to being stopped.
    private readonly idleTimers = new Map<Worker.Id, NodeJS.Timeout>();

    constructor(
        @InjectQueue(Execution.Queue.ID)
        private readonly queue: Queue,
        private readonly cloud: CloudService,
        private readonly realtime: RealtimeService,
        @Inject(forwardRef(() => ExecutionService))
        private readonly executions: ExecutionService,
    ) {}

    public onModuleInit(): void {
        // Whatever state the workers are in after a restart, each gets its countdown.
        for (const workerId of WORKER_IDS)
            this.armTimer(workerId);

        this.realtime.subscribe<Worker.Event>(Worker.Event.getChannel(), (event) => {
            if (event.type !== 'worker:shutting-down')
                return;

            void this.onWorkerShuttingDown(event);
        });
    }

    /**
     * The worker names what it is abandoning on the way out. Those runs have no
     * outcome to report and nothing else will report one, so they are closed here
     * rather than waiting for the reconciler to reach the same answer minutes later.
     */
    private async onWorkerShuttingDown(event: Worker.Event.ShuttingDown): Promise<void> {
        const workerId = event.workerId
        // A worker that shut down is no longer waking or counting down.
        if (workerId) {
            this.wakeRequestedAt.delete(workerId);

            this.disarmTimer(workerId);
        }

        const executionIds = event.executionIds

        for (const executionId of executionIds) {
            try {
                await this.executions.fail(executionId, 'Worker shut down mid-run');

                this.logger.warn(`Failed execution ${executionId}: its worker shut down`);
            }
            catch (error) {
                this.logger.error(`Could not fail abandoned execution ${executionId}: ${error instanceof Error ? error.message : error}`);
            }
        }
    }

    public onModuleDestroy(): void {
        for (const workerId of [...this.idleTimers.keys()])
            this.disarmTimer(workerId);
    }

    // False when there are no workers to drive.
    private hasWorkers(): boolean {
        return this.cloud.hasWorkspaceIdentity && WORKER_IDS.length > 0;
    }

    // Call after enqueueing. Wakes as many sleeping workers as the queue needs.
    public async ensureComputeForJob(): Promise<void> {
        if (!this.hasWorkers())
            return;

        try {
            const [active, waiting, connectedWorkers] = await Promise.all([
                this.queue.getActiveCount(),
                this.queue.getWaitingCount(),
                this.getConnectedWorkerIds(),
            ]);

            const workersNeeded = Math.ceil((active + waiting) / EXECUTION_CONCURRENCY);

            const now = Date.now();

            // Asked to wake by an earlier call, possibly still booting.
            const recentlyWoken = WORKER_IDS.filter((workerId) => now - (this.wakeRequestedAt.get(workerId) ?? 0) < WAKE_GRACE_MS);

            const awakeOrWaking = new Set([...connectedWorkers, ...recentlyWoken]);

            const sleepingWorkers = WORKER_IDS.filter((workerId) => !awakeOrWaking.has(workerId));

            const workersToWake = sleepingWorkers.slice(0, Math.max(workersNeeded - awakeOrWaking.size, 0));

            // Recorded before the request, so an enqueue arriving meanwhile does not wake them again.
            for (const workerId of workersToWake) {
                this.wakeRequestedAt.set(workerId, now);

                this.armTimer(workerId);
            }

            await Promise.all(workersToWake.map((workerId) => this.wake(workerId)));
        }
        catch (error) {
            // The job is already queued; a worker that is awake still takes it.
            this.logger.warn(`Could not work out which workers to wake: ${error instanceof Error ? error.message : error}`);
        }
    }

    // The driven workers connected to the queue right now.
    private async getConnectedWorkerIds(): Promise<Worker.Id[]> {
        const clients = await this.queue.getWorkers();

        const names = clients.map((client) => client.rawname?.split(WORKER_NAME_SEPARATOR)[1]);

        return WORKER_IDS.filter((workerId) => names.includes(workerId));
    }

    // Restarts the countdown of the worker that ran the job.
    public async noteJobEnded(jobId: string): Promise<void> {
        if (!this.hasWorkers())
            return;

        const job = await this.queue.getJob(jobId);

        const workerId = WORKER_IDS.find((id) => id === job?.processedBy);

        if (workerId) {
            this.armTimer(workerId);

            return;
        }

        // The job was already removed, so every counting worker gets a fresh window.
        for (const armedWorkerId of [...this.idleTimers.keys()])
            this.armTimer(armedWorkerId);
    }

    private armTimer(workerId: Worker.Id): void {
        if (!this.hasWorkers())
            return;

        this.disarmTimer(workerId);

        this.idleTimers.set(workerId, setTimeout(() => void this.sleepIfIdle(workerId), IDLE_MS));
    }

    private disarmTimer(workerId: Worker.Id): void {
        const timer = this.idleTimers.get(workerId);

        if (timer)
            clearTimeout(timer);

        this.idleTimers.delete(workerId);
    }

    private async sleepIfIdle(workerId: Worker.Id): Promise<void> {
        try {
            const [activeJobs, waiting, delayed] = await Promise.all([
                this.queue.getActive(),
                this.queue.getWaitingCount(),
                this.queue.getDelayedCount(),
            ]);

            const runningJobsOnWorker = activeJobs.filter((job) => job.processedBy === workerId);

            // Busy, or work is queued that may need its capacity.
            if (runningJobsOnWorker.length > 0 || waiting + delayed > 0) {
                this.armTimer(workerId);

                return;
            }

            await this.cloud.post(`/api/workspaces/${this.cloud.workspaceId}/workers/${workerId}/sleep`);

            this.idleTimers.delete(workerId);

            this.wakeRequestedAt.delete(workerId);

            this.logger.log(`Worker ${workerId} stopped after an idle period`);
        }
        catch (error) {
            this.logger.warn(`Could not stop worker ${workerId}: ${error instanceof Error ? error.message : error}`);

            this.armTimer(workerId);
        }
    }

    private async wake(workerId: Worker.Id): Promise<void> {
        try {
            await this.cloud.post(`/api/workspaces/${this.cloud.workspaceId}/workers/${workerId}/wake`);
        }
        catch (error) {
            // The request failed, so the next enqueue tries again.
            this.wakeRequestedAt.delete(workerId);

            this.logger.warn(`Could not wake worker ${workerId}: ${error instanceof Error ? error.message : error}`);
        }
    }
}
