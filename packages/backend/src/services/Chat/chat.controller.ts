import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Chat } from '@pretzel-graph/shared/domain';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { CurrentUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('chat')
@UseGuards(UserAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }


    @Post('create')
    @HttpCode(200)
    async create(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Chat.API.Create.Request) body: Chat.API.Create.Request,
    ) {
        return await this.chatService.create(principal, body);
    }


    @Post('ensure')
    @HttpCode(200)
    async ensure(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Chat.API.Ensure.Request) body: Chat.API.Ensure.Request,
    ) {
        return await this.chatService.ensure(principal, body);
    }


    @Post('get')
    @HttpCode(200)
    async get(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Chat.API.Get.Request) body: Chat.API.Get.Request,
    ) {
        return await this.chatService.get(principal, body);
    }


    @Post('list')
    @HttpCode(200)
    async list(@CurrentUser() principal: Principal.User) {
        return await this.chatService.list(principal);
    }


    @Post('list-by-workflow')
    @HttpCode(200)
    async listByWorkflow(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Chat.API.ListByWorkflow.Request) body: Chat.API.ListByWorkflow.Request,
    ) {
        return await this.chatService.listByWorkflow(principal, body);
    }


    @Post('erase')
    @HttpCode(200)
    async erase(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Chat.API.Erase.Request) body: Chat.API.Erase.Request,
    ) {
        return await this.chatService.erase(principal, body);
    }


    @Post('message/add')
    @HttpCode(200)
    async addMessage(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Chat.API.Message.Add.Request) body: Chat.API.Message.Add.Request,
    ) {
        return await this.chatService.message.add(principal, body);
    }


    @Post('message/erase')
    @HttpCode(200)
    async eraseMessage(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Chat.API.Message.Erase.Request) body: Chat.API.Message.Erase.Request,
    ) {
        return await this.chatService.message.erase(principal, body);
    }


    @Post('message/update')
    @HttpCode(200)
    async updateMessage(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Chat.API.Message.Update.Request) body: Chat.API.Message.Update.Request,
    ) {
        return await this.chatService.message.update(principal, body);
    }
}
