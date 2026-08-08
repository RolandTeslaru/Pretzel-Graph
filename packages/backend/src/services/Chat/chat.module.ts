import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { InternalChatController } from './internal-chat.controller';
import { ChatService } from './chat.service';
import { ChatDatabase } from './chat.database';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [RealtimeModule],
    controllers: [ChatController, InternalChatController],
    providers: [ChatService, ChatDatabase],
    exports: [ChatService],
})
export class ChatModule { }
