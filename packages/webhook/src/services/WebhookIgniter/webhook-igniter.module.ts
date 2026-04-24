import { Module } from '@nestjs/common';
import { WebhookIgniterController } from './webhook-igniter.controller';
import { WebhookIgniterService } from './webhook-igniter.service';
import { WorkflowRegistryModule } from '../WorkflowRegistry/workflow-registry.module';

@Module({
    imports: [WorkflowRegistryModule],
    controllers: [WebhookIgniterController],
    providers: [WebhookIgniterService],
})
export class WebhookIgniterModule {}
