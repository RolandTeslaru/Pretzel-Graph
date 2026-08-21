import { Injectable, Logger } from '@nestjs/common';

/** Long enough that a burst of runs wakes once, short enough to retry a failure. */
const REMEMBER_MS = 60_000;

/**
 * Wakes the machine that drains the queue, when there is a separate one.
 *
 * A sleeping worker is not connected to Redis, so nothing reaches it by being
 * enqueued — something has to say "work is coming" first, and the only moment
 * that is known is here. Left unconfigured this does nothing: a deployment whose
 * worker shares the machine has nothing to wake.
 */
@Injectable()
export class WorkerWakeService {

    private readonly logger = new Logger(WorkerWakeService.name);

    private wokeAt = 0;

    private inFlight: Promise<void> | null = null;

    async ensure(): Promise<void> {
        const url = process.env.WORKER_WAKE_URL;

        if (!url)
            return;

        if (Date.now() - this.wokeAt < REMEMBER_MS)
            return;

        // Single-flight: a burst of executions is one wake, not one each.
        this.inFlight ??= this.wake(url).finally(() => { this.inFlight = null; });

        await this.inFlight;
    }

    private async wake(url: string): Promise<void> {
        try {
            const response = await fetch(url, {
                method:  'POST',
                headers: { 'X-Workspace-Backend-Token': process.env.CONTROL_PLANE_TOKEN ?? '' },
            });

            if (!response.ok)
                throw new Error(`${response.status} ${response.statusText}`);

            this.wokeAt = Date.now();
        }
        catch (error) {
            // Not fatal: the job is already durable in the queue, and the run
            // path times out with its own error if nothing picks it up.
            this.logger.warn(`Could not wake the worker: ${error instanceof Error ? error.message : error}`);
        }
    }
}
