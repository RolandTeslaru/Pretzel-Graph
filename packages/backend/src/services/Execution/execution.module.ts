import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { ExecutionReconciler } from './execution.reconciler';
import { ExecutionRepository } from './execution.repository';
import { ChatDatabase } from '../Chat/chat.database';
import { VaultRepository } from '../Vault/vault.repository';
import { Execution } from '@pretzel-graph/shared/domain';
import { RealtimeModule } from '../Realtime/realtime.module';
import { CloudModule } from '../Cloud/cloud.module';
import { WorkerModule } from '../Worker/worker.module';

@Module({
    imports: [
        BullModule.registerQueue({ name: Execution.Queue.ID }),
        RealtimeModule,
        CloudModule,
        forwardRef(() => WorkerModule),
    ],
    controllers: [ExecutionController],
    providers: [ExecutionService, ExecutionReconciler, ExecutionRepository, ChatDatabase, VaultRepository],
    exports: [ExecutionService],
})
export class ExecutionModule {}
