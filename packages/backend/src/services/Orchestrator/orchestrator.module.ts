import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { Orchestrator } from '@vx-agent-editor/shared/domain';
import { RealtimeModule } from '../Realtime/realtime.module';
import { ChatModule } from '../Chat/chat.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: Orchestrator.EXECUTION_QUEUE_ID,
        }),
        RealtimeModule,
        ChatModule,
    ],
    controllers: [OrchestratorController],
    providers: [OrchestratorService],
})
export class OrchestratorModule { }
