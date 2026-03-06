import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
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
    providers: [],
})
export class AppModule { }
