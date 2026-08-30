import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Execution } from '@pretzel-graph/shared/domain';
import { WorkerLifecycleService } from './worker-lifecycle.service';
import { ExecutionModule } from '../Execution/execution.module';
import { RealtimeModule } from '../Realtime/realtime.module';
import { CloudModule } from '../Cloud/cloud.module';

@Module({
    imports: [
        BullModule.registerQueue({ name: Execution.Queue.ID }),
        RealtimeModule,
        CloudModule,
        forwardRef(() => ExecutionModule),
    ],
    providers: [WorkerLifecycleService],
    exports: [WorkerLifecycleService],
})
export class WorkerModule { }
