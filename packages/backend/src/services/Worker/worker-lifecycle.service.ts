import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, forwardRef } from '@nestjs/common';
import { Job, Queue, Worker as BullWorker } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Execution, Worker } from '@pretzel-graph/shared/domain';
import { CloudService } from '../Cloud/cloud.service';
import { ExecutionService } from '../Execution/execution.service';
import { RealtimeService } from '../Realtime/realtime.service';

// How long a woken worker may take to answer before the wake counts as failed.
const WAKE_GRACE_MS = 60_000;
const WORKER_REPLY_TIMEOUT_MS = 2_000;
const PREPARE_TIMEOUT_MS = 10_000;

// How long a worker may sit idle before it is suspended.
const IDLE_MS = Number(process.env.WORKER_IDLE_SECONDS ?? 600) * 1_000;

// Attempts at one wake before the next enqueue has to ask again.
const WAKE_ATTEMPTS = 3;
const WAKE_BACKOFF_MS = 5_000;

const WAKE_JOB  = 'wake';
const SLEEP_JOB = 'sleep';

// The workers this backend drives; empty when it runs executions itself.
const WORKER_IDS = (process.env.WORKER_IDS ?? '')
    .split(',')
    .filter((workerId) => workerId.length > 0)
    .map((workerId) => Worker.Id.parse(workerId));

// Executions one worker runs at once.
const EXECUTION_CONCURRENCY = Number(process.env.EXECUTION_CONCURRENCY ?? 5);

// A named worker's queue connection is `<queue>:w:<name>`.
const WORKER_NAME_SEPARATOR = ':w:';

const LIFECYCLE_CONNECTION = { host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD, maxRetriesPerRequest: null };

const getLifecycleQueueName = (workerId: Worker.Id) => `worker-lifecycle-${workerId}`;

// Wakes workers for queued work and suspends each one after it goes idle. Each worker has its
// own lifecycle queue, consumed one job at a time, so its wake and suspend never overlap.
@Injectable()
export class WorkerLifecycleService implements OnModuleInit, OnModuleDestroy {

    private readonly logger = new Logger(WorkerLifecycleService.name);

    private readonly lifecycleQueues = new Map<Worker.Id, Queue>();

    private readonly lifecycleConsumers = new Map<Worker.Id, BullWorker>();

    constructor(
        @InjectQueue(Execution.Queue.ID)
        private readonly queue: Queue,
        private readonly cloud: CloudService,
        private readonly realtime: RealtimeService,
        @Inject(forwardRef(() => ExecutionService))
        private readonly executions: ExecutionService,
    ) {}

    public async onModuleInit(): Promise<void> {
        this.realtime.subscribe<Worker.Event>(Worker.Event.getChannel(), (event) => {
            if (event.type !== 'worker:shutting-down')
                return;

            void this.onWorkerShuttingDown(event);
        });

        if (!this.hasWorkers())
            return;

        for (const workerId of WORKER_IDS) {
            this.lifecycleQueues.set(workerId, new Queue(getLifecycleQueueName(workerId), { connection: LIFECYCLE_CONNECTION }));

            const consumer = new BullWorker(
                getLifecycleQueueName(workerId),
                (job: Job) => this.runLifecycleJob(workerId, job),
                { connection: LIFECYCLE_CONNECTION, concurrency: 1 },
            );

            consumer.on('failed', (job, error) =>
                this.logger.warn(`Worker ${workerId} ${job?.name ?? 'lifecycle'} job failed: ${error.message}`),
            );

            consumer.on('error', (error) =>
                this.logger.warn(`Worker ${workerId} lifecycle consumer: ${error.message}`),
            );

            this.lifecycleConsumers.set(workerId, consumer);
        }

        // A countdown already scheduled survives the restart; a worker without one gets one.
        for (const workerId of WORKER_IDS) {
            if (!await this.hasPendingSleep(workerId))
                await this.armTimer(workerId);
        }
    }

    /**
     * The worker names what it is abandoning on the way out. Those runs have no
     * outcome to report and nothing else will report one, so they are closed here
     * rather than waiting for the reconciler to reach the same answer minutes later.
     */
    private async onWorkerShuttingDown(event: Worker.Event.ShuttingDown): Promise<void> {
        const workerId = event.workerId
        // A worker that shut down is no longer counting down.
        if (workerId)
            await this.disarmTimer(workerId).catch(() => {});

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

    public async onModuleDestroy(): Promise<void> {
        await Promise.allSettled([
            ...[...this.lifecycleConsumers.values()].map((consumer) => consumer.close()),
            ...[...this.lifecycleQueues.values()].map((queue) => queue.close()),
        ]);
    }

    // False when there are no workers to drive.
    private hasWorkers(): boolean {
        return this.cloud.hasWorkspaceIdentity && WORKER_IDS.length > 0;
    }

    // Call after enqueueing. Queues a wake for as many sleeping workers as the queue needs.
    public async ensureComputeForJob(): Promise<void> {
        if (!this.hasWorkers())
            return;

        try {
            const [active, waiting, connectedWorkers, wakingWorkers] = await Promise.all([
                this.queue.getActiveCount(),
                this.queue.getWaitingCount(),
                this.getConnectedWorkerIds(),
                this.getWakingWorkerIds(),
            ]);

            const workersNeeded = Math.ceil((active + waiting) / EXECUTION_CONCURRENCY);

            const awakeOrWaking = new Set([...connectedWorkers, ...wakingWorkers]);

            const sleepingWorkers = WORKER_IDS.filter((workerId) => !awakeOrWaking.has(workerId));

            const workersToWake = sleepingWorkers.slice(0, Math.max(workersNeeded - awakeOrWaking.size, 0));

            if (workersToWake.length > 0)
                this.logger.log(`Queue needs ${workersNeeded} worker(s); ${connectedWorkers.length} connected, ${wakingWorkers.length} waking, waking ${workersToWake.join(', ')}`);

            await Promise.all(workersToWake.map((workerId) => this.requestWake(workerId)));
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

    // The driven workers with a wake queued or running.
    private async getWakingWorkerIds(): Promise<Worker.Id[]> {
        const wakes = await Promise.all(WORKER_IDS.map((workerId) => this.lifecycleQueues.get(workerId)?.getJob(WAKE_JOB)));

        return WORKER_IDS.filter((_, index) => wakes[index] !== undefined);
    }

    // A wake already queued for this worker absorbs the request.
    private async requestWake(workerId: Worker.Id): Promise<void> {
        this.logger.log(`Queued a wake for worker ${workerId}`);

        await this.lifecycleQueues.get(workerId)?.add(WAKE_JOB, {}, {
            jobId:            WAKE_JOB,
            attempts:         WAKE_ATTEMPTS,
            backoff:          { type: 'exponential', delay: WAKE_BACKOFF_MS },
            removeOnComplete: true,
            removeOnFail:     true,
        });
    }

    // Restarts the countdown of the worker that ran the job.
    public async noteJobEnded(jobId: string): Promise<void> {
        if (!this.hasWorkers())
            return;

        const job = await this.queue.getJob(jobId);

        const workerId = WORKER_IDS.find((id) => id === job?.processedBy);

        // The job was already removed, so every worker gets a fresh window.
        const workerIds = workerId ? [workerId] : WORKER_IDS;

        await Promise.all(workerIds.map((id) => this.armTimer(id)));
    }

    private runLifecycleJob(workerId: Worker.Id, job: Job): Promise<void> {
        switch (job.name) {
            case WAKE_JOB:
                return this.wake(workerId);
            case SLEEP_JOB:
                return this.sleepIfIdle(workerId);
            default:
                throw new Error(`Unknown lifecycle job ${job.name}`);
        }
    }

    // Restarts the worker's countdown, or schedules one if it has none.
    private async armTimer(workerId: Worker.Id): Promise<void> {
        const queue = this.lifecycleQueues.get(workerId);

        if (!queue)
            return;

        const [pendingSleep] = await this.getPendingSleeps(workerId);

        if (pendingSleep) {
            try {
                await pendingSleep.changeDelay(IDLE_MS);

                return;
            }
            catch {
                // It started running meanwhile, so a new countdown follows it.
            }
        }

        await queue.add(SLEEP_JOB, {}, {
            jobId:            `${SLEEP_JOB}-${randomUUID()}`,
            delay:            IDLE_MS,
            removeOnComplete: true,
            removeOnFail:     true,
        });
    }

    private async disarmTimer(workerId: Worker.Id): Promise<void> {
        const pendingSleeps = await this.getPendingSleeps(workerId);

        await Promise.allSettled(pendingSleeps.map((job) => job.remove()));
    }

    private async hasPendingSleep(workerId: Worker.Id): Promise<boolean> {
        return (await this.getPendingSleeps(workerId)).length > 0;
    }

    // Countdowns not yet run; a wake retrying after a failure is delayed too, so they are told apart by name.
    private async getPendingSleeps(workerId: Worker.Id): Promise<Job[]> {
        const delayed = await this.lifecycleQueues.get(workerId)?.getDelayed() ?? [];

        return delayed.filter((job): job is Job => job.name === SLEEP_JOB);
    }

    private async sleepIfIdle(workerId: Worker.Id): Promise<void> {
        this.logger.log(`Worker ${workerId} reached its idle window; checking the queue`);

        try {
            const [activeJobs, waiting, delayed, connectedWorkers] = await Promise.all([
                this.queue.getActive(),
                this.queue.getWaitingCount(),
                this.queue.getDelayedCount(),
                this.getConnectedWorkerIds(),
            ]);

            // Already down; the next wake schedules its countdown.
            if (!connectedWorkers.includes(workerId)) {
                this.logger.log(`Worker ${workerId} is not connected; leaving it down`);

                return;
            }

            const runningJobsOnWorker = activeJobs.filter((job) => job.processedBy === workerId);

            // Busy, or work is queued that may need its capacity.
            if (runningJobsOnWorker.length > 0 || waiting + delayed > 0) {
                this.logger.log(`Worker ${workerId} stays awake: ${runningJobsOnWorker.length} running, ${waiting + delayed} queued`);

                await this.armTimer(workerId);

                return;
            }

            const ready = await this.prepareToSleep(workerId);

            if (!ready) {
                this.logger.log(`Worker ${workerId} did not report ready to sleep; keeping it consuming`);

                this.realtime.emitSignal({
                    type: 'worker:consumption:resume',
                    channel: Worker.Signal.getChannel(workerId),
                    workerId,
                    requestId: Worker.RequestId.parse(randomUUID()),
                } satisfies Worker.Signal.Consumption.Resume);

                await this.armTimer(workerId);

                return;
            }

            // Work that arrived during the drain keeps this worker available.
            const [waitingAfterDrain, delayedAfterDrain] = await Promise.all([
                this.queue.getWaitingCount(),
                this.queue.getDelayedCount(),
            ]);

            if (waitingAfterDrain + delayedAfterDrain > 0) {
                this.logger.log(`Work arrived while worker ${workerId} drained; reopening it`);

                await this.resumeWorkerConsumption(workerId);
                await this.armTimer(workerId);

                return;
            }

            this.logger.log(`Worker ${workerId} drained; asking the platform to suspend it`);

            try {
                await this.cloud.post(`/api/workspaces/${this.cloud.workspaceId}/workers/${workerId}/sleep`);
            }
            catch (error) {
                // A failed suspend leaves the machine running, so reopen its consumer.
                await this.resumeWorkerConsumption(workerId).catch(resumeError =>
                    this.logger.error(`Could not reopen worker ${workerId} after suspend failed: ${resumeError instanceof Error ? resumeError.message : resumeError}`),
                );

                throw error;
            }

            this.logger.log(`Worker ${workerId} suspended after an idle period`);
        }
        catch (error) {
            this.logger.warn(`Could not suspend worker ${workerId}: ${error instanceof Error ? error.message : error}`);

            await this.armTimer(workerId);
        }
    }

    // Throws so the job retries; a wake that runs out of attempts leaves the next enqueue to ask again.
    private async wake(workerId: Worker.Id): Promise<void> {
        const start = Date.now();

        await this.cloud.post(`/api/workspaces/${this.cloud.workspaceId}/workers/${workerId}/wake`);

        await this.resumeWorkerConsumption(workerId);

        // The idle countdown starts once the worker is taking jobs.
        await this.armTimer(workerId);

        this.logger.log(`Worker ${workerId} is consuming again after ${Date.now() - start}ms`);
    }




    private prepareToSleep(workerId: Worker.Id): Promise<boolean> {
        const requestId = Worker.RequestId.parse(randomUUID());

        this.logger.log(`Asking worker ${workerId} to prepare for sleep`);

        return this.realtime.signalAndAwaitEvent<Worker.Signal.Sleep.Prepare>(
            {
                type: 'worker:sleep:prepare',
                channel: Worker.Signal.getChannel(workerId),
                workerId,
                requestId,
            },
            Worker.Event.getChannel(),
            'worker:sleep:ready',
            PREPARE_TIMEOUT_MS,
            event => {
                const ready = Worker.Event.Sleep.Ready.safeParse(event);

                return ready.success
                    && ready.data.workerId === workerId
                    && ready.data.requestId === requestId;
            },
        );
    }




    private async resumeWorkerConsumption(workerId: Worker.Id): Promise<void> {
        const requestId = Worker.RequestId.parse(randomUUID());
        const deadline  = Date.now() + WAKE_GRACE_MS;

        const signal: Worker.Signal.Consumption.Resume = {
            type: 'worker:consumption:resume',
            channel: Worker.Signal.getChannel(workerId),
            workerId,
            requestId,
        };

        while (Date.now() < deadline) {
            const ready = await this.realtime.signalAndAwaitEvent(
                signal,
                Worker.Event.getChannel(),
                'worker:consumption:ready',
                Math.max(1, Math.min(WORKER_REPLY_TIMEOUT_MS, deadline - Date.now())),
                event => {
                    const response = Worker.Event.Consumption.Ready.safeParse(event);

                    return response.success
                        && response.data.workerId === workerId
                        && response.data.requestId === requestId;
                },
            );

            if (ready)
                return;
        }

        throw new Error(`Worker ${workerId} did not become ready within ${WAKE_GRACE_MS}ms`);
    }
}
