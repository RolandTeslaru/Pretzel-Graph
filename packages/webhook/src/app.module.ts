import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ApiModule } from './services/Api/api.module';
import { IgniterModule } from './services/Igniter/igniter.module';
import { IgniterTestModule } from './services/IgniterTest/igniter-test.module';
import { PublishedWorkflowCacheModule } from './services/PublishedWorkflowCache/published-workflow-cache.module';

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
        IgniterTestModule,
        PublishedWorkflowCacheModule,
        IgniterModule,
    ],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    ],
})
export class AppModule {}
