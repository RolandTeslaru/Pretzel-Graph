import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { ExecutionDataService } from './execution.data.service';
import { ExecutionRecordingService } from './execution.recording.service';
import { ExecutionTracker } from './execution.tracker';
import { ExecutionReconciler } from './execution.reconciler';
import { ExecutionRepository } from './execution.repository';
import { ChatModule } from '../Chat/chat.module';
import { Execution } from '@pretzel-graph/shared/domain';
import { RealtimeModule } from '../Realtime/realtime.module';
import { CloudModule } from '../Cloud/cloud.module';
import { WorkerModule } from '../Worker/worker.module';
import { WorkbenchModule } from '../Workbench/workbench.module';
import { ShelfModule } from '../Shelf/shelf.module';
import { VaultModule } from '../Vault/vault.module';

@Module({
    imports: [
        BullModule.registerQueue({ name: Execution.Queue.ID }),
        RealtimeModule,
        ChatModule,
        CloudModule,
        forwardRef(() => WorkerModule),
        WorkbenchModule,
        ShelfModule,
        VaultModule,
    ],
    controllers: [ExecutionController],
    providers: [ExecutionService, ExecutionDataService, ExecutionRecordingService, ExecutionTracker, ExecutionReconciler, ExecutionRepository],
    exports: [ExecutionService, ExecutionTracker],
})
export class ExecutionModule {}
