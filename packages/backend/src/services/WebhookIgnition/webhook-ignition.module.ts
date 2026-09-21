import { Module } from '@nestjs/common';
import { IgniterModule } from './Igniter/igniter.module';
import { IgniterTestModule } from './IgniterTest/igniter-test.module';

@Module({
    imports: [IgniterTestModule, IgniterModule],
    exports: [IgniterTestModule],
})
export class WebhookIgnitionModule {}
