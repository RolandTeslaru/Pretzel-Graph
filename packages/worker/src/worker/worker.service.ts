import { BeforeApplicationShutdown, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Worker as BullWorker } from 'bullmq';
import IORedis from 'ioredis';
import * as http from 'node:http';
import * as https from 'node:https';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Execution, Worker as WorkerD } from '@pretzel-graph/shared/domain';
import { RealtimeService } from '../realtime/realtime.service';
import { bounded } from '../utils';
import { BookkeepingService } from './services/bookkeeping.service';
import { ConnectionPoolService } from './services/connection-pool.service';
import { QueueProcessorService } from './services/queue-processor.service';

// Total budget ~10s, within the stop grace period.
const CLOSE_TIMEOUT_MS   = 4_000;
const FORCE_TIMEOUT_MS   = 2_000;
const QUIT_TIMEOUT_MS    = 1_000;

// Null when the worker runs without an assigned id.
const WORKER_ID = process.env.WORKER_ID
    ? WorkerD.Id.parse(process.env.WORKER_ID)
    : null;

const createRedisConnection = () =>
    new IORedis({ host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD, maxRetriesPerRequest: null });

// Consumes the queue, lets go of connections around a suspend, and takes them down on the way out.
@Injectable()
export class WorkerService implements OnApplicationBootstrap, BeforeApplicationShutdown, OnApplicationShutdown {

    private redisWorker = createRedisConnection();

    private bullWorker: BullWorker<Execution.Queue.Item> | null = null;

    private sleeping = false;
    private lifecycleTransition = Promise.resolve();
    private removeLifecycleSubscription: (() => void) | null = null;

    constructor(
        private readonly realtime: RealtimeService,
        private readonly bookkeeping: BookkeepingService,
        private readonly queueProcessor: QueueProcessorService,
        private readonly connectionPools: ConnectionPoolService,
    ) {}




    public async onApplicationBootstrap(): Promise<void> {
        await this.startConsuming();

        if (WORKER_ID) {
            this.removeLifecycleSubscription = this.realtime.subscribe<WorkerD.Signal>(
                WorkerD.Signal.getChannel(WORKER_ID),
                signal => this.queueLifecycleSignal(signal),
            );
        }
    }




    // Releases suspend-sensitive resources only when no execution is running.
    public async sleep(): Promise<boolean> {
        if (this.sleeping || !this.bullWorker)
            return this.sleeping;

        // Stop taking jobs first, so none can start between the check and the close.
        await this.bullWorker.pause(true);

        if (this.bookkeeping.getRunningExecutionIds().length > 0) {
            await this.bullWorker.resume();

            return false;
        }

        // A closed BullMQ worker cannot run again, so `resume` builds a new one.
        try {
            await this.bullWorker.close();
        }
        catch (error) {
            try {
                this.bullWorker.resume();
            }
            catch {}

            throw error;
        }

        this.bullWorker = null;
        this.sleeping = true;

        try {
            await this.connectionPools.purgeAll();

            // Idle keep-alive sockets would be stale after a suspend.
            http.globalAgent.destroy();
            https.globalAgent.destroy();

            await this.redisWorker.quit();
        }
        catch (error) {
            this.redisWorker.disconnect();

            await this.resume().catch(() => {});

            throw error;
        }

        return true;
    }




    // Reopens what `sleep` let go of and takes jobs again.
    public async resume(): Promise<void> {
        if (!this.sleeping) {
            await this.bullWorker?.waitUntilReady();

            return;
        }

        await this.realtime.reconnect();

        this.redisWorker = createRedisConnection();

        await this.startConsuming();

        this.sleeping = false;
    }




    // Runs while realtime is still connected, so running executions can report their end.
    public async beforeApplicationShutdown(): Promise<void> {
        console.log('[Worker] Shutting down: draining queue');

        // Announce running executions before anything that can block.
        const executionIds = this.bookkeeping.getRunningExecutionIds();

        if (executionIds.length > 0) {
            const event: WorkerD.Event.ShuttingDown = {
                type:     'worker:shutting-down',
                channel:  WorkerD.Event.getChannel(),
                workerId: WORKER_ID,
                executionIds,
            };

            await this.realtime.emit(event);
        }

        if (this.bullWorker) {
            const closed = await bounded(this.bullWorker.close().then(() => 'closed' as const), CLOSE_TIMEOUT_MS);

            if (closed === 'timeout')
                await bounded(this.bullWorker.close(true).catch(() => {}), FORCE_TIMEOUT_MS);
        }
    }




    public async onApplicationShutdown(): Promise<void> {
        this.removeLifecycleSubscription?.();

        await bounded(this.redisWorker.quit().catch(() => {}), QUIT_TIMEOUT_MS);

        this.redisWorker.disconnect();
    }




    private async startConsuming(): Promise<void> {
        this.bullWorker = new BullWorker(Execution.Queue.ID, this.queueProcessor.processJob, {
            connection:  this.redisWorker,
            autorun:     false,
            name:        WORKER_ID ?? undefined,
            concurrency: Number(process.env.EXECUTION_CONCURRENCY ?? 5),
            // Lease must outlast long synchronous evaluation or the job is marked stalled.
            lockDuration:    5 * 60_000,
            stalledInterval: 5 * 60_000,
            // Never re-run a stalled job; fail it visibly.
            maxStalledCount: 0,
        });

        void this.bullWorker.run().catch(error => {
            if (!this.sleeping)
                console.error(`[Worker] Queue consumer stopped: ${error instanceof Error ? error.message : error}`);
        });

        await this.bullWorker.waitUntilReady();
    }




    private queueLifecycleSignal(raw: WorkerD.Signal): void {
        const parsed = WorkerD.Signal.Schema.safeParse(raw);

        if (!parsed.success || parsed.data.workerId !== WORKER_ID)
            return;

        const signal = parsed.data;

        this.lifecycleTransition = this.lifecycleTransition
            .catch(() => {})
            .then(() => this.handleLifecycleSignal(signal))
            .catch(error => {
                console.error(`[Worker] Lifecycle transition failed: ${error instanceof Error ? error.message : error}`);
            });
    }




    private async handleLifecycleSignal(signal: WorkerD.Signal): Promise<void> {
        if (!WORKER_ID)
            return;

        const channel = WorkerD.Event.getChannel();

        switch (signal.type) {
            case 'worker:sleep:prepare': {
                if (!await this.sleep())
                    return;

                await this.realtime.emit({
                    type: 'worker:sleep:ready',
                    channel,
                    workerId: WORKER_ID,
                    requestId: signal.requestId,
                } satisfies WorkerD.Event.Sleep.Ready);

                break;
            }

            case 'worker:consumption:resume': {
                await this.resume();

                await this.realtime.emit({
                    type: 'worker:consumption:ready',
                    channel,
                    workerId: WORKER_ID,
                    requestId: signal.requestId,
                } satisfies WorkerD.Event.Consumption.Ready);

                break;
            }
        }
    }
}
