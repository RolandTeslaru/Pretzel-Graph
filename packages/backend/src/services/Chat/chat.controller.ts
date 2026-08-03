import { Controller, Post, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Auth, Chat } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('chat')
@UseGuards(SupabaseAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }


    @Post('create')
    @HttpCode(200)
    async create(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Chat.API.Create.Request) body: Chat.API.Create.Request,
    ) {
        return await this.chatService.create(req.token, req.user.id as Auth.User.Id, body);
    }


    @Post('ensure')
    @HttpCode(200)
    async ensure(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Chat.API.Ensure.Request) body: Chat.API.Ensure.Request,
    ) {
        return await this.chatService.ensure(req.token, req.user.id as Auth.User.Id, body);
    }


    @Post('get')
    @HttpCode(200)
    async get(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Chat.API.Get.Request) body: Chat.API.Get.Request,
    ) {
        return await this.chatService.get(req.token, req.user.id as Auth.User.Id, body);
    }


    @Post('list')
    @HttpCode(200)
    async list(@Req() req: AuthenticatedRequest) {
        return await this.chatService.list(req.token, req.user.id as Auth.User.Id);
    }


    @Post('list-by-workflow')
    @HttpCode(200)
    async listByWorkflow(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Chat.API.ListByWorkflow.Request) body: Chat.API.ListByWorkflow.Request,
    ) {
        return await this.chatService.listByWorkflow(req.token, req.user.id as Auth.User.Id, body);
    }


    @Post('erase')
    @HttpCode(200)
    async erase(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Chat.API.Erase.Request) body: Chat.API.Erase.Request,
    ) {
        return await this.chatService.erase(req.token, req.user.id as Auth.User.Id, body);
    }


    @Post('message/add')
    @HttpCode(200)
    async addMessage(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Chat.API.Message.Add.Request) body: Chat.API.Message.Add.Request,
    ) {
        return await this.chatService.message.add(req.token, body);
    }


    @Post('message/erase')
    @HttpCode(200)
    async eraseMessage(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Chat.API.Message.Erase.Request) body: Chat.API.Message.Erase.Request,
    ) {
        return await this.chatService.message.erase(req.token, body);
    }


    @Post('message/update')
    @HttpCode(200)
    async updateMessage(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Chat.API.Message.Update.Request) body: Chat.API.Message.Update.Request,
    ) {
        return await this.chatService.message.update(req.token, body);
    }
}
