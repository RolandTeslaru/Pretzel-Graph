import { Module } from '@nestjs/common';
import { TriggerController } from './trigger.controller';
import { TriggerService } from './trigger.service';
import { WorkflowRegistryModule } from '../WorkflowRegistry/workflow-registry.module';

@Module({
    imports: [WorkflowRegistryModule],
    controllers: [TriggerController],
    providers: [TriggerService],
})
export class TriggerModule {}
