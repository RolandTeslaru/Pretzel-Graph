import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { Execution } from '@pretzel-graph/shared/domain';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [
        BullModule.registerQueue({ name: Execution.Queue.ID }),
        RealtimeModule,
    ],
    controllers: [ExecutionController],
    providers: [ExecutionService],
})
export class ExecutionModule {}
