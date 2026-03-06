import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ExecutionSessionModule } from '../ExecutionSession/execution-session.module';

@Module({
    imports: [ExecutionSessionModule],
    controllers: [ChatController],
    providers: [ChatService],
})
export class ChatModule { }
