import { Injectable } from '@nestjs/common';
import { Activity, Execution } from '@pretzel-graph/shared/domain';
import { RealtimeService } from '../Realtime/realtime.service';

@Injectable()
export class ExecutionTracker {

    // Every run that has not settled, fed by `announce` and emptied as each one finishes.
    private readonly activeExecutions = new Set<Execution.Id>();

    private readonly settledListeners = new Set<(executionId: Execution.Id) => void>();

    constructor(
        private readonly realtime: RealtimeService,
    ) {}




    public isActive(executionId: Execution.Id): boolean {
        return this.activeExecutions.has(executionId);
    }




    // Called once per run, as it settles, however it ended.
    public onSettled(listener: (executionId: Execution.Id) => void): () => void {
        this.settledListeners.add(listener);

        return () => this.settledListeners.delete(listener);
    }




    // Tells the workspace a run reached a new state; call only after the write commits.
    public announce(execution: Execution.Meta): void {
        this.trackLifecycle(execution);

        const channel = Activity.Event.getChannel();

        this.realtime.emitEvent({
            type: 'activity:execution:upserted',
            channel,
            execution,
        } satisfies Activity.Event.Execution.Upserted);
    }




    private trackLifecycle(execution: Execution.Meta): void {
        if (Execution.isActive(execution)) {
            this.activeExecutions.add(execution.id);
            return;
        }

        if (!this.activeExecutions.delete(execution.id))
            return;

        for (const listener of this.settledListeners)
            listener(execution.id);
    }
}
