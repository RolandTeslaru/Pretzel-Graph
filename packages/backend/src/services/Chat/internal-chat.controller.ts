import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { Chat } from '@pretzel-graph/shared/domain';
import { InternalAuthGuard } from '../../auth/internal-auth.guard';
import { createServiceClient } from '../../utils/supabase';
import { ChatDatabase } from './chat.database';

@Controller('internal/chat')
@UseGuards(InternalAuthGuard)
export class InternalChatController {
    constructor(private readonly database: ChatDatabase) {}

    @Post('message/add')
    @HttpCode(200)
    async addMessage(@Body() body: Chat.API.Message.Add.Request) {
        const payload = Chat.API.Message.Add.Request.parse(body);
        const supabase = createServiceClient();
        await this.database.message.add(supabase, payload.messages);

        return {};
    }

    @Post('message/update')
    @HttpCode(200)
    async updateMessage(@Body() body: Chat.API.Message.Update.Request) {
        const payload = Chat.API.Message.Update.Request.parse(body);
        const supabase = createServiceClient();
        await this.database.message.update(supabase, payload.messageId, payload.content);

        return {};
    }
}
