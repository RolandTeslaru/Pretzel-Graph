import { Module } from '@nestjs/common';
import { PublishedWorkflowCacheService } from './published-workflow-cache.service';

@Module({
    providers: [PublishedWorkflowCacheService],
    exports: [PublishedWorkflowCacheService],
})
export class PublishedWorkflowCacheModule {}
