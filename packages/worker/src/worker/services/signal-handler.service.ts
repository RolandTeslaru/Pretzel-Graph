import { Injectable } from '@nestjs/common';
import { Execution } from '@pretzel-graph/shared/domain';
import { BookkeepingService } from './bookkeeping.service';
import { LockService } from './lock.service';

// Applies signals sent to running executions.
@Injectable()
export class SignalHandlerService {

    constructor(
        private readonly bookkeeping: BookkeepingService,
        private readonly locks: LockService,
    ) {}




    public handle(signal: Execution.Signal): void {
        const engine = this.bookkeeping.get(signal.executionId);

        if (!engine)
            return;

        switch (signal.type) {
            case 'terminate':
                engine.ctx.abortAPI.abort();
                break;
            case 'pause':
                engine.pause();
                break;
            case 'resume':
                engine.resume();
                break;
            case 'suspend':
                engine.ctx.abortAPI.abort();
                break;
            case 'heartbeat':
                this.locks.resetPauseLimit(signal.executionId);
                break;
        }
    }
}
