import { Module } from '@nestjs/common';
import { IgniterController } from './igniter.controller';
import { IgniterService } from './igniter.service';
import { PublishedWorkflowCacheModule } from '../PublishedWorkflowCache/published-workflow-cache.module';
import { ExecutionModule } from '../../Execution/execution.module';

@Module({
    imports: [PublishedWorkflowCacheModule, ExecutionModule],
    controllers: [IgniterController],
    providers: [IgniterService],
})
export class IgniterModule {}
