import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { InternalChatController } from './internal-chat.controller';
import { ChatService } from './chat.service';

@Module({
    controllers: [ChatController, InternalChatController],
    providers: [ChatService],
    exports: [ChatService],
})
export class ChatModule { }
