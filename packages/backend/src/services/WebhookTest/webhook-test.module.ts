import { Module } from '@nestjs/common';
import { WebhookTestController } from './webhook-test.controller';
import { IgniterTestModule } from '../WebhookIgnition/IgniterTest/igniter-test.module';

@Module({
    imports: [IgniterTestModule],
    controllers: [WebhookTestController],
})
export class WebhookTestModule {}
