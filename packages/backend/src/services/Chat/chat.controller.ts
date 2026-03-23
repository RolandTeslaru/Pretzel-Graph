import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Auth, Chat } from '@vx-agent-editor/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('chat')
@UseGuards(SupabaseAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }


    @Post('create')
    @HttpCode(200)
    async create(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Chat.API.Create.Request.parse(body);
        return await this.chatService.create(req.token, req.user.id as Auth.User.Id, payload);
    }


    @Post('ensure')
    @HttpCode(200)
    async ensure(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Chat.API.Ensure.Request.parse(body);
        return await this.chatService.ensure(req.token, req.user.id as Auth.User.Id, payload);
    }


    @Post('get')
    @HttpCode(200)
    async get(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Chat.API.Get.Request.parse(body);
        return await this.chatService.get(req.token, req.user.id as Auth.User.Id, payload);
    }


    @Post('list')
    @HttpCode(200)
    async list(
        @Req() req: AuthenticatedRequest
    ) {
        return await this.chatService.list(req.token, req.user.id as Auth.User.Id);
    }


    @Post('erase')
    @HttpCode(200)
    async erase(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Chat.API.Erase.Request.parse(body);
        return await this.chatService.erase(req.token, req.user.id as Auth.User.Id, payload);
    }


    @Post('message/add')
    @HttpCode(200)
    async addMessage(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Chat.API.Message.Add.Request.parse(body);
        return await this.chatService.message.add(req.token, payload);
    }


    @Post('message/erase')
    @HttpCode(200)
    async eraseMessage(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Chat.API.Message.Erase.Request.parse(body);
        return await this.chatService.message.erase(req.token, payload);
    }


    @Post('message/update')
    @HttpCode(200)
    async updateMessage(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Chat.API.Message.Update.Request.parse(body);
        return await this.chatService.message.update(req.token, payload);
    }
}
