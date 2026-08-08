import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { Chat, Execution } from '@pretzel-graph/shared/domain';
import { RuntimeNodeAuthGuard } from '../../auth/runtime-node-auth.guard';
import { DB } from '@/db';
import { ChatDatabase } from './chat.database';
import { ZodBody } from '../../pipes/zod.pipe';
import { PermissionService } from '../Permission/permission.service';
import { RealtimeService } from '../Realtime/realtime.service';
import { z } from 'zod';

const accessRequest = z.object({
    executionId: Execution.Id,
    chatId:      Chat.Id,
});

const addMessageRequest = accessRequest.extend({
    messages:  z.array(Chat.Message.Schema),
    persist:   z.boolean().default(true),
    broadcast: z.boolean().default(false),
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
        private readonly realtime: RealtimeService,
    ) {}

    // The chat id arrives from a user-editable node field, so the broadcast lives here —
    // behind assertExecutionChat — rather than in the worker, which cannot check ownership.
    @Post('message/add')
    @HttpCode(200)
    async addMessage(
        @ZodBody(addMessageRequest) body: z.infer<typeof addMessageRequest>,
    ) {
        await this.ownership.assertExecutionChat(body.executionId, body.chatId);

        if (body.persist)
            await DB.asService('internal chat message add', (db) => this.database.message.add(db, body.chatId, body.messages));

        if (body.broadcast)
            this.realtime.emitSignal<Chat.Event.Message.Added>({
                type:     'message:added',
                channel:  Chat.Event.getChannel(body.chatId),
                chatId:   body.chatId,
                messages: body.messages,
            });

        return {};
    }

    @Post('message/update')
    @HttpCode(200)
    async updateMessage(
        @ZodBody(updateMessageRequest) body: z.infer<typeof updateMessageRequest>,
    ) {
        await this.ownership.assertExecutionChat(body.executionId, body.chatId);

        await DB.asService('internal chat message update', (db) => this.database.message.updateInChat(db, body.chatId, body.messageId, body.content));
        return {};
    }

    @Post('message/list')
    @HttpCode(200)
    async listMessages(@ZodBody(accessRequest) body: z.infer<typeof accessRequest>) {
        await this.ownership.assertExecutionChat(body.executionId, body.chatId);

        const messages = await DB.asService('internal chat message list', (db) => this.database.message.list(db, body.chatId));
        return { messages };
    }

    @Post('message/overwrite')
    @HttpCode(200)
    async overwriteMessages(@ZodBody(overwriteMessagesRequest) body: z.infer<typeof overwriteMessagesRequest>) {
        await this.ownership.assertExecutionChat(body.executionId, body.chatId);

        await DB.asService('internal chat message overwrite', (db) => this.database.message.overwrite(db, body.chatId, body.messages));
        return {};
    }
}
