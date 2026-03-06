import { Module } from '@nestjs/common';
import { ExecutionSessionController } from './execution-session.controller';
import { ExecutionSessionService } from './execution-session.service';

@Module({
    controllers: [ExecutionSessionController],
    providers: [ExecutionSessionService],
    exports: [ExecutionSessionService]
})
export class ExecutionSessionModule { }
