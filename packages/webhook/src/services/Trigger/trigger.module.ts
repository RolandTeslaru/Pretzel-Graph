import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Orchestrator } from '@vx-agent-editor/shared/domain';
import { TriggerController } from './trigger.controller';
import { TriggerService } from './trigger.service';

@Module({
    imports: [
        BullModule.registerQueue({ name: Orchestrator.EXECUTION_QUEUE_ID }),
    ],
    controllers: [TriggerController],
    providers: [TriggerService],
})
export class TriggerModule {}