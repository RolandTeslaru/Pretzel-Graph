import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'workflow-execution',
        }),
    ],
    controllers: [OrchestratorController],
    providers: [OrchestratorService],
})
export class OrchestratorModule { }
