import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { WorkerWakeService } from './worker-wake.service';
import { ExecutionReconciler } from './execution.reconciler';
import { ExecutionDatabase } from './execution.database';
import { ChatDatabase } from '../Chat/chat.database';
import { VaultDatabase } from '../Vault/vault.database';
import { Execution } from '@pretzel-graph/shared/domain';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [
        BullModule.registerQueue({ name: Execution.Queue.ID }),
        RealtimeModule,
    ],
    controllers: [ExecutionController],
    providers: [ExecutionService, WorkerWakeService, ExecutionReconciler, ExecutionDatabase, ChatDatabase, VaultDatabase],
    exports: [ExecutionService],
})
export class ExecutionModule {}
