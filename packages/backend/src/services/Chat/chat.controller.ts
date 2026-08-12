import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Chat, Workflow } from '@pretzel-graph/shared/domain';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { Scoped } from '../../auth/scoped.decorator';
import { AuthenticatedUser } from '@/decorators/principal';
import { ChatIdParam, WorkflowIdParam } from '@/decorators/scope';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';

@Controller('chat')
@UseGuards(UserAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }


    // ── Unmigrated, and declared first on purpose ────────────────────────────────
    // `message/erase` is two literal segments, which `:chatId/erase` below also matches
    // (chatId = "message"). Routes resolve in declaration order, so these must stay above
    // it. The constraint disappears once both move under `:chatId/message/...`.

    @Post('message/erase')
    @HttpCode(200)
    async eraseMessage(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Chat.API.Message.Erase.Request) body: Chat.API.Message.Erase.Request,
    ) {
        return await this.chatService.message.erase(principal, body);
    }


    @Post('message/update')
    @HttpCode(200)
    async updateMessage(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Chat.API.Message.Update.Request) body: Chat.API.Message.Update.Request,
    ) {
        return await this.chatService.message.update(principal, body);
    }

    // ─────────────────────────────────────────────────────────────────────────────


    @Post('list')
    @HttpCode(200)
    async list(@AuthenticatedUser() principal: Principal.User) {
        return await this.chatService.list(principal);
    }


    @Post(':workflowId/create')
    @Scoped('workflow')
    @HttpCode(200)
    async create(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
        @ZodBody(Chat.API.Create.Request) body: Chat.API.Create.Request,
    ) {
        return await this.chatService.create(principal, workflowId, body);
    }


    @Post(':workflowId/ensure')
    @Scoped('workflow')
    @HttpCode(200)
    async ensure(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
        @ZodBody(Chat.API.Ensure.Request) body: Chat.API.Ensure.Request,
    ) {
        return await this.chatService.ensure(principal, workflowId, body);
    }


    @Post(':workflowId/list')
    @Scoped('workflow')
    @HttpCode(200)
    async listByWorkflow(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
    ) {
        return await this.chatService.listByWorkflow(principal, workflowId);
    }


    @Post(':chatId/get')
    @Scoped('chat')
    @HttpCode(200)
    async get(
        @AuthenticatedUser() principal: Principal.User,
        @ChatIdParam() chatId: Chat.Id,
        @ZodBody(Chat.API.Get.Request) _body: Chat.API.Get.Request,
    ) {
        return await this.chatService.get(principal, chatId);
    }


    @Post(':chatId/erase')
    @Scoped('chat')
    @HttpCode(200)
    async erase(
        @AuthenticatedUser() principal: Principal.User,
        @ChatIdParam() chatId: Chat.Id,
    ) {
        return await this.chatService.erase(principal, chatId);
    }


    @Post(':chatId/message/add')
    @Scoped('chat')
    @HttpCode(200)
    async addMessage(
        @AuthenticatedUser() principal: Principal.User,
        @ChatIdParam() chatId: Chat.Id,
        @ZodBody(Chat.API.Message.Add.Request) body: Chat.API.Message.Add.Request,
    ) {
        return await this.chatService.message.add(principal, chatId, body);
    }
}
