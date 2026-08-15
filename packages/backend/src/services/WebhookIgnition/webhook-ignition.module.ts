import { Module } from '@nestjs/common';
import { IgniterModule } from './Igniter/igniter.module';
import { IgniterTestModule } from './IgniterTest/igniter-test.module';
import { PublishedWorkflowCacheModule } from './PublishedWorkflowCache/published-workflow-cache.module';

@Module({
    imports: [PublishedWorkflowCacheModule, IgniterTestModule, IgniterModule],
    exports: [IgniterTestModule],
})
export class WebhookIgnitionModule {}
