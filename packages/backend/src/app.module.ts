import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants";
import { OrchestratorModule } from './services/Orchestrator/orchestrator.module';
import { ChatModule } from './services/Chat/chat.module';
import { ExecutionSessionModule } from './services/ExecutionSession/execution-session.module';
import { LibraryModule } from './services/Library/library.module';
import { ShelfModule } from './services/Shelf/shelf.module';
import { WorkbenchModule } from './services/Workbench/workbench.module';
import { RealtimeModule } from './services/Realtime/realtime.module';

@Module({
    imports: [
        // Rate limiting: max 100 requests per 60 seconds per IP
        ThrottlerModule.forRoot({
            throttlers: [{ ttl: 60000, limit: 100 }],
        }),
        BullModule.forRoot({
            connection: {
                host: REDIS_HOST,
                port: REDIS_PORT,
            },
        }),
        OrchestratorModule,
        ChatModule,
        ExecutionSessionModule,
        LibraryModule,
        ShelfModule,
        WorkbenchModule,
        RealtimeModule,
    ],
    controllers: [],
    providers: [
        // Apply rate limiting globally to all endpoints
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule { }
