import { Injectable } from '@nestjs/common';
import { Job as BullJob } from 'bullmq';
import { Execution } from '@pretzel-graph/shared/domain';

const LOCK_EXTEND_INTERVAL_MS = 15_000;
const LOCK_EXTEND_DURATION_MS = 30_000;
const MAX_PAUSE_DURATION_MS   = 5 * 60_000;

// Keeps a paused execution's job lease alive, and ends a pause nobody comes back to.
@Injectable()
export class LockService {

    private readonly lockExtensions = new Map<Execution.Id, NodeJS.Timeout>();

    private readonly pauseLimits = new Map<Execution.Id, { timer: NodeJS.Timeout; onTimeout: () => void }>();




    // Nothing touches a paused job, so its lease would lapse without this.
    public startLockExtension(executionId: Execution.Id, job: BullJob, token?: string): void {
        if (this.lockExtensions.has(executionId) || !token)
            return;

        const timer = setInterval(async () => {
            try {
                await job.extendLock(token, LOCK_EXTEND_DURATION_MS);
            }
            catch (error) {
                console.error(`[Worker] Failed to extend lock for execution ${executionId}:`, error);
            }
        }, LOCK_EXTEND_INTERVAL_MS);

        this.lockExtensions.set(executionId, timer);
    }




    // Calls `onTimeout` once the pause outlasts its limit.
    public startPauseLimit(executionId: Execution.Id, onTimeout: () => void): void {
        this.clearPauseLimit(executionId);

        this.pauseLimits.set(executionId, { timer: setTimeout(onTimeout, MAX_PAUSE_DURATION_MS), onTimeout });
    }




    // A heartbeat from a watching client restarts the limit.
    public resetPauseLimit(executionId: Execution.Id): void {
        const pauseLimit = this.pauseLimits.get(executionId);

        if (!pauseLimit)
            return;

        this.startPauseLimit(executionId, pauseLimit.onTimeout);
    }




    // Clears both the lease extension and the pause limit.
    public stop(executionId: Execution.Id): void {
        const lockExtension = this.lockExtensions.get(executionId);

        if (lockExtension)
            clearInterval(lockExtension);

        this.lockExtensions.delete(executionId);

        this.clearPauseLimit(executionId);
    }




    private clearPauseLimit(executionId: Execution.Id): void {
        const pauseLimit = this.pauseLimits.get(executionId);

        if (pauseLimit)
            clearTimeout(pauseLimit.timer);

        this.pauseLimits.delete(executionId);
    }
}
