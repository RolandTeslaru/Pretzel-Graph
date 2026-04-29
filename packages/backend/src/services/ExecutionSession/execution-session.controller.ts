import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ExecutionSessionService } from './execution-session.service';
import { Auth, ExecutionSession } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('execution-session')
@UseGuards(SupabaseAuthGuard)
export class ExecutionSessionController {
    constructor(private readonly executionSessionService: ExecutionSessionService) { }

    @Post('create')
    @HttpCode(200)
    async create(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = ExecutionSession.API.Create.Request.parse(body);
        return await this.executionSessionService.create(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('get')
    @HttpCode(200)
    async get(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = ExecutionSession.API.Get.Request.parse(body);
        return await this.executionSessionService.get(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('update')
    @HttpCode(200)
    async update(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = ExecutionSession.API.Update.Request.parse(body);
        return await this.executionSessionService.update(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('meta/list')
    @HttpCode(200)
    async listMeta(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = ExecutionSession.API.Meta.List.Request.parse(body);
        return await this.executionSessionService.listMeta(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('meta/get')
    @HttpCode(200)
    async getMeta(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = ExecutionSession.API.Meta.Get.Request.parse(body);
        return await this.executionSessionService.getMeta(req.token, req.user.id as Auth.User.Id, payload);
    }
}
