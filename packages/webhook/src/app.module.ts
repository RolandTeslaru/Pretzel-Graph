import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { REDIS_HOST, REDIS_PORT } from '@vx-agent-editor/shared/constants';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ApiModule } from './services/Api/api.module';
import { TriggerModule } from './services/Trigger/trigger.module';
import { WorkflowRegistryModule } from './services/WorkflowRegistry/workflow-registry.module';

@Module({
    imports: [
        ThrottlerModule.forRoot({
            throttlers: [{ ttl: 60000, limit: 300 }],
        }),
        BullModule.forRoot({
            connection: {
                host: REDIS_HOST,
                port: REDIS_PORT,
            },
            defaultJobOptions: {
                removeOnComplete: { count: 20 },
                removeOnFail: { count: 50 },
            },
        }),
        ApiModule,
        TriggerModule,
        WorkflowRegistryModule,
    ],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    ],
})
export class AppModule {}
