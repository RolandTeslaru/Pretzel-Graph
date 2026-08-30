import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { WorkerLifecycleService } from './worker-lifecycle.service';
import { ExecutionReconciler } from './execution.reconciler';
import { ExecutionDatabase } from './execution.database';
import { ChatDatabase } from '../Chat/chat.database';
import { VaultRepository } from '../Vault/vault.repository';
import { Execution } from '@pretzel-graph/shared/domain';
import { RealtimeModule } from '../Realtime/realtime.module';
import { CloudModule } from '../Cloud/cloud.module';

@Module({
    imports: [
        BullModule.registerQueue({ name: Execution.Queue.ID }),
        RealtimeModule,
        CloudModule,
    ],
    controllers: [ExecutionController],
    providers: [ExecutionService, WorkerLifecycleService, ExecutionReconciler, ExecutionDatabase, ChatDatabase, VaultRepository],
    exports: [ExecutionService],
})
export class ExecutionModule {}
