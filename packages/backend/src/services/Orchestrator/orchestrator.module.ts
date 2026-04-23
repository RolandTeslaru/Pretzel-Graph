import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { Orchestrator } from '@pretzel-graph/shared/domain';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: Orchestrator.EXECUTION_QUEUE_ID,
        }),
        RealtimeModule,
    ],
    controllers: [OrchestratorController],
    providers: [OrchestratorService],
})
export class OrchestratorModule { }
