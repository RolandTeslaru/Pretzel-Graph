import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { Chat } from '@pretzel-graph/shared/domain';
import { RuntimeNodeAuthGuard } from '../../auth/runtime-node-auth.guard';
import { createServiceClient } from '../../utils/supabase';
import { ChatDatabase } from './chat.database';

@Controller('internal/chat')
@UseGuards(RuntimeNodeAuthGuard)
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

    @Post('message/list')
    @HttpCode(200)
    async listMessages(@Body() body: { chatId: Chat.Id }) {
        const supabase = createServiceClient();
        const messages = await this.database.message.list(supabase, body.chatId);
        return { messages };
    }

    @Post('message/overwrite')
    @HttpCode(200)
    async overwriteMessages(@Body() body: Chat.API.Message.Add.Request & { chatId: Chat.Id }) {
        const supabase = createServiceClient();
        await this.database.message.overwrite(supabase, body.chatId, body.messages);
        return {};
    }
}
