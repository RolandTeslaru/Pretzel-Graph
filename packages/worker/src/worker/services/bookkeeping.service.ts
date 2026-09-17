import { Injectable } from '@nestjs/common';
import { Execution } from '@pretzel-graph/shared/domain';
import { AggexEngine } from 'src/engine';

// The executions this worker is running right now.
@Injectable()
export class BookkeepingService {

    private readonly runningEngines = new Map<Execution.Id, AggexEngine>();




    public add(executionId: Execution.Id, engine: AggexEngine): void {
        this.runningEngines.set(executionId, engine);
    }




    public get(executionId: Execution.Id): AggexEngine | undefined {
        return this.runningEngines.get(executionId);
    }




    public remove(executionId: Execution.Id): void {
        this.runningEngines.delete(executionId);
    }




    public getRunningExecutionIds(): Execution.Id[] {
        return [...this.runningEngines.keys()];
    }
}
