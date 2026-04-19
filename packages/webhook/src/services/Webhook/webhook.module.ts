import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Orchestrator } from '@vx-agent-editor/shared/domain';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
    imports: [
        BullModule.registerQueue({ name: Orchestrator.EXECUTION_QUEUE_ID }),
    ],
    controllers: [WebhookController],
    providers: [WebhookService],
})
export class WebhookModule {}
