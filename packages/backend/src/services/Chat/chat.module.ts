import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { InternalChatController } from './internal-chat.controller';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [RealtimeModule],
    controllers: [ChatController, InternalChatController],
    providers: [ChatService, ChatRepository],
    exports: [ChatService],
})
export class ChatModule { }
