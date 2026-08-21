import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Execution } from '@pretzel-graph/shared/domain';

/** Long enough that a burst of runs wakes once, short enough to retry a failure. */
const REMEMBER_MS = 60_000;

/** Quiet for this long and the worker is stopped. */
const IDLE_MS = 20 * 60_000;

/**
 * Drives the machine that drains the queue, when there is a separate one.
 *
 * A stopped worker is not connected to Redis, so nothing reaches it by being
 * enqueued — something has to say "work is coming" first. It is stopped again
 * once the queue has been quiet. Left unconfigured this does nothing: a
 * deployment whose worker shares the machine has nothing to drive.
 */
@Injectable()
export class WorkerLifecycleService implements OnModuleInit, OnModuleDestroy {

    private readonly logger = new Logger(WorkerLifecycleService.name);

    private wokeAt = 0;

    private inFlight: Promise<void> | null = null;

    private idleTimer: NodeJS.Timeout | null = null;

    constructor(
        @InjectQueue(Execution.Queue.ID)
        private readonly queue: Queue,
    ) {}

    /** A restart must not leave a worker running with nothing to do. */
    onModuleInit(): void {
        this.arm();
    }

    onModuleDestroy(): void {
        this.disarm();
    }

    /** Called before enqueueing, the only moment anything knows work is coming. */
    async ensureAwake(): Promise<void> {
        this.arm();

        const base = process.env.WORKER_LIFECYCLE_URL;

        if (!base)
            return;

        if (Date.now() - this.wokeAt < REMEMBER_MS)
            return;

        // Single-flight: a burst of executions is one wake, not one each.
        this.inFlight ??= this.wake(base).finally(() => { this.inFlight = null; });

        await this.inFlight;
    }

    /** Called when a job ends, so the idle window runs from the last one. */
    noteJobEnded(): void {
        this.arm();
    }

    private arm(): void {
        if (!process.env.WORKER_LIFECYCLE_URL)
            return;

        this.disarm();

        this.idleTimer = setTimeout(() => void this.sleepIfQuiet(), IDLE_MS);

        // Don't keep the event loop alive just for the timer.
        this.idleTimer.unref();
    }

    private disarm(): void {
        if (this.idleTimer)
            clearTimeout(this.idleTimer);

        this.idleTimer = null;
    }

    private async sleepIfQuiet(): Promise<void> {
        const base = process.env.WORKER_LIFECYCLE_URL;

        if (!base)
            return;

        try {
            const [active, waiting, delayed] = await Promise.all([
                this.queue.getActiveCount(),
                this.queue.getWaitingCount(),
                this.queue.getDelayedCount(),
            ]);

            // Work arrived while the window was closing.
            if (active + waiting + delayed > 0) {
                this.arm();

                return;
            }

            await this.post(`${base}/sleep`);

            // The next enqueue has to wake it rather than trust the last wake.
            this.wokeAt = 0;

            this.logger.log('Worker stopped after an idle period');
        }
        catch (error) {
            this.logger.warn(`Could not stop the worker: ${error instanceof Error ? error.message : error}`);

            this.arm();
        }
    }

    private async wake(base: string): Promise<void> {
        try {
            await this.post(`${base}/wake`);

            this.wokeAt = Date.now();
        }
        catch (error) {
            // Not fatal: the job is already durable in the queue, and the run
            // path times out with its own error if nothing picks it up.
            this.logger.warn(`Could not wake the worker: ${error instanceof Error ? error.message : error}`);
        }
    }

    private async post(url: string): Promise<void> {
        const response = await fetch(url, {
            method:  'POST',
            headers: { 'X-Workspace-Backend-Token': process.env.CONTROL_PLANE_TOKEN ?? '' },
        });

        if (!response.ok)
            throw new Error(`${response.status} ${response.statusText}`);
    }
}
