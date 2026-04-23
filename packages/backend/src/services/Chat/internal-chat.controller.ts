import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { Chat } from '@pretzel-graph/shared/domain';
import { InternalAuthGuard } from '../../auth/internal-auth.guard';
import { createServiceClient } from '../../utils/supabase';

@Controller('internal/chat')
@UseGuards(InternalAuthGuard)
export class InternalChatController {

    @Post('message/add')
    @HttpCode(200)
    async addMessage(@Body() body: any) {
        const payload = Chat.API.Message.Add.Request.parse(body);
        const supabase = createServiceClient();
        const { messages } = payload;

        await supabase
            .from('chat_messages')
            .insert(messages.map(message => ({
                id: message.id,
                chat_id: message.chat_id,
                role: message.role,
                content: message.content,
                data: message.data ?? {},
                attachments: message.attachments ?? null,
                created_at: new Date(),
            })))
            .throwOnError();

        return {};
    }

    @Post('message/update')
    @HttpCode(200)
    async updateMessage(@Body() body: any) {
        const payload = Chat.API.Message.Update.Request.parse(body);
        const supabase = createServiceClient();
        const { messageId, content } = payload;

        await supabase
            .from('chat_messages')
            .update({ content })
            .eq('id', messageId)
            .throwOnError();

        return {};
    }
}
