import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { Chat, Execution } from '@pretzel-graph/shared/domain';
import { RuntimeNodeAuthGuard } from '../../auth/runtime-node-auth.guard';
import { createServiceClient } from '../../utils/supabase';
import { ChatDatabase } from './chat.database';
import { ZodBody } from '../../pipes/zod.pipe';
import { PermissionService } from '../Permission/permission.service';
import { z } from 'zod';

const accessRequest = z.object({
    executionId: Execution.Id,
    chatId:      Chat.Id,
});

const addMessageRequest = accessRequest.extend({
    messages: z.array(Chat.Message.Schema),
});

const updateMessageRequest = accessRequest.extend({
    messageId: Chat.Message.Id,
    content:   z.string(),
});

const overwriteMessagesRequest = accessRequest.extend({
    messages: z.array(Chat.Message.Schema),
});

@Controller('internal/chat')
@UseGuards(RuntimeNodeAuthGuard)
export class InternalChatController {
    constructor(
        private readonly database: ChatDatabase,
        private readonly ownership: PermissionService,
    ) {}

    @Post('message/add')
    @HttpCode(200)
    async addMessage(
        @ZodBody(addMessageRequest) body: z.infer<typeof addMessageRequest>,
    ) {
        await this.ownership.assertExecutionChat(body.executionId, body.chatId);

        const supabase = createServiceClient();
        await this.database.message.add(supabase, body.chatId, body.messages);
        return {};
    }

    @Post('message/update')
    @HttpCode(200)
    async updateMessage(
        @ZodBody(updateMessageRequest) body: z.infer<typeof updateMessageRequest>,
    ) {
        await this.ownership.assertExecutionChat(body.executionId, body.chatId);

        const supabase = createServiceClient();
        await this.database.message.updateInChat(supabase, body.chatId, body.messageId, body.content);
        return {};
    }

    @Post('message/list')
    @HttpCode(200)
    async listMessages(@ZodBody(accessRequest) body: z.infer<typeof accessRequest>) {
        await this.ownership.assertExecutionChat(body.executionId, body.chatId);

        const supabase = createServiceClient();
        const messages = await this.database.message.list(supabase, body.chatId);
        return { messages };
    }

    @Post('message/overwrite')
    @HttpCode(200)
    async overwriteMessages(@ZodBody(overwriteMessagesRequest) body: z.infer<typeof overwriteMessagesRequest>) {
        await this.ownership.assertExecutionChat(body.executionId, body.chatId);

        const supabase = createServiceClient();
        await this.database.message.overwrite(supabase, body.chatId, body.messages);
        return {};
    }
}
