import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, forwardRef } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Execution, Worker } from '@pretzel-graph/shared/domain';
import { CloudService } from '../Cloud/cloud.service';
import { ExecutionService } from '../Execution/execution.service';
import { RealtimeService } from '../Realtime/realtime.service';

// Dedupe window for wake calls.
const REMEMBER_MS = 60_000;

// Idle window before the worker is stopped.
const IDLE_MS = 20 * 60_000;

// Wakes the worker before work is enqueued and stops it after the queue goes quiet.
@Injectable()
export class WorkerLifecycleService implements OnModuleInit, OnModuleDestroy {

    private readonly logger = new Logger(WorkerLifecycleService.name);

    private wokeAt = 0;

    private inFlight: Promise<void> | null = null;

    private idleTimer: NodeJS.Timeout | null = null;

    constructor(
        @InjectQueue(Execution.Queue.ID)
        private readonly queue: Queue,
        private readonly cloud: CloudService,
        private readonly realtime: RealtimeService,
        // Circular by design: this drives the worker, and the worker going down
        // decides what becomes of the runs that were on it.
        @Inject(forwardRef(() => ExecutionService))
        private readonly executions: ExecutionService,
    ) {}

    public onModuleInit(): void {
        this.arm();

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
        // The idle timer is measuring a process that is gone, and a stale `wokeAt`
        // would let the next enqueue skip the wake it needs.
        this.disarm();
        this.wokeAt = 0;

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
        this.disarm();
    }

    // Null when there is no worker to drive.
    private getLifecycleBase(): string | null {
        if (!this.cloud.hasWorkspaceIdentity)
            return null;

        return `/api/workspaces/${this.cloud.workspaceId}/worker`;
    }

    // Call before enqueueing.
    public async ensureAwake(): Promise<void> {
        this.arm();

        const base = this.getLifecycleBase();

        if (!base)
            return;

        if (Date.now() - this.wokeAt < REMEMBER_MS)
            return;

        // Single-flight across a burst.
        this.inFlight ??= this.wake(base).finally(() => { this.inFlight = null; });

        await this.inFlight;
    }

    // Restarts the idle window.
    public noteJobEnded(): void {
        this.arm();
    }

    private arm(): void {
        if (!this.getLifecycleBase())
            return;

        this.disarm();

        this.idleTimer = setTimeout(() => void this.sleepIfQuiet(), IDLE_MS);

    }

    private disarm(): void {
        if (this.idleTimer)
            clearTimeout(this.idleTimer);

        this.idleTimer = null;
    }

    private async sleepIfQuiet(): Promise<void> {
        const base = this.getLifecycleBase();

        if (!base)
            return;

        try {
            const [active, waiting, delayed] = await Promise.all([
                this.queue.getActiveCount(),
                this.queue.getWaitingCount(),
                this.queue.getDelayedCount(),
            ]);

            if (active + waiting + delayed > 0) {
                this.arm();

                return;
            }

            await this.post(`${base}/sleep`);

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
            this.logger.warn(`Could not wake the worker: ${error instanceof Error ? error.message : error}`);
        }
    }

    private async post(path: string): Promise<void> {
        const response = await this.cloud.fetch(path, { method: 'POST' });

        if (!response.ok)
            throw new Error(`${response.status} ${response.statusText}`);
    }
}
