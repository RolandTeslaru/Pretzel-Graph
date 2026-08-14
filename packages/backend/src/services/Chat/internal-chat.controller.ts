import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { Chat } from '@pretzel-graph/shared/domain';
import { DelegateAuthGuard } from '../../auth/delegate-auth.guard';
import { AuthenticatedDelegate } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { DB } from '@/db';
import { ChatDatabase } from './chat.database';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { RealtimeService } from '../Realtime/realtime.service';
import { z } from 'zod';

// No executionId — the guard reads it from the execution token, so a caller cannot
// name one. See SPECS/execution-token-delegation.md.
const accessRequest = z.object({
    chatId: Chat.Id,
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
@UseGuards(DelegateAuthGuard)
export class InternalChatController {
    constructor(
        private readonly database: ChatDatabase,
        private readonly realtime: RealtimeService,
    ) {}


    // The chat id comes from a node field, so the broadcast lives here, not in the worker.
    @Post('message/add')
    @HttpCode(200)
    async addMessage(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @ZodBody(addMessageRequest) body: z.infer<typeof addMessageRequest>,
    ) {

        if (body.persist)
            await DB.asDelegate(delegate, (trx) => this.database.message.add(trx, body.chatId, body.messages));

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
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @ZodBody(updateMessageRequest) body: z.infer<typeof updateMessageRequest>,
    ) {

        await DB.asDelegate(delegate, (trx) => this.database.message.updateInChat(trx, body.chatId, body.messageId, body.content));
        return {};
    }

    @Post('message/list')
    @HttpCode(200)
    async listMessages(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @ZodBody(accessRequest) body: z.infer<typeof accessRequest>,
    ) {

        const messages = await DB.asDelegate(delegate, (trx) => this.database.message.list(trx, body.chatId));
        return { messages };
    }

    @Post('message/overwrite')
    @HttpCode(200)
    async overwriteMessages(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @ZodBody(overwriteMessagesRequest) body: z.infer<typeof overwriteMessagesRequest>,
    ) {

        await DB.asDelegate(delegate, (trx) => this.database.message.overwrite(trx, body.chatId, body.messages));
        return {};
    }
}
