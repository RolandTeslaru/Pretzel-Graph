import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Execution } from '@pretzel-graph/shared/domain';
import { Principal } from '@/domain/Principal';
import { ExecutionRepository } from './execution.repository';
import { ExecutionService } from './execution.service';

/** Rows younger than this are left alone — they may not have been picked up yet. */
const GRACE_MS = 2 * 60_000;

const SWEEP_MS = 60_000;

/**
 * An execution whose worker died has nobody left to record the outcome: the row
 * sticks at pending while the job is gone or failed. The live case is covered by
 * the queue's failed-event listener; this sweep covers what nothing heard —
 * a wiped queue, or events emitted while this process was down. Nothing is ever
 * re-run: the row becomes failed, and re-running is the caller's act.
 */
@Injectable()
export class ExecutionReconciler implements OnModuleInit {

    private readonly logger = new Logger(ExecutionReconciler.name);

    constructor(
        @InjectQueue(Execution.Queue.ID)
        private readonly queue: Queue,
        private readonly executionRepository: ExecutionRepository,
        private readonly executions: ExecutionService,
    ) {}

    onModuleInit(): void {
        void this.sweep();

        const timer = setInterval(() => void this.sweep(), SWEEP_MS);
        (timer as { unref?: () => void }).unref?.();
    }

    private async sweep(): Promise<void> {
        try {
            const stale = await this.executionRepository.meta.listStaleNonTerminal(Principal.SELF, GRACE_MS);

            for (const { id } of stale) {
                const job   = await this.queue.getJob(id);
                const state = job ? await job.getState() : 'missing';

                // An active, waiting or delayed job is a live run — a parked
                // consultation looks exactly like this — and is left alone.
                if (job && state !== 'failed' && state !== 'completed')
                    continue;

                // A completed job over a non-terminal row means the final update
                // never landed; the results are gone either way.
                await this.executions.fail(id, `Its worker never reported an outcome (job ${state})`);

                this.logger.warn(`Reconciled orphaned execution ${id} (job ${state})`);
            }
        }
        catch (error) {
            this.logger.error(`Sweep failed: ${error instanceof Error ? error.message : error}`);
        }
    }
}
