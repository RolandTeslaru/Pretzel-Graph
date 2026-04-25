import { Module } from '@nestjs/common';
import { WebhookTestController } from './webhook-test.controller';
import { WebhookTestService } from './webhook-test.service';

@Module({
    controllers: [WebhookTestController],
    providers: [WebhookTestService],
})
export class WebhookTestModule {}
