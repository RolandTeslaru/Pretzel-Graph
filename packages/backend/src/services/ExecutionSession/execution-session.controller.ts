import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ExecutionSessionService } from './execution-session.service';
import { ExecutionSession } from '@vx-agent-editor/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('execution-session')
@UseGuards(SupabaseAuthGuard)
export class ExecutionSessionController {
    constructor(private readonly executionSessionService: ExecutionSessionService) { }

    @Post('create')
    @HttpCode(200)
    async create(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = ExecutionSession.API.Create.Request.parse(body);
        return await this.executionSessionService.create(req.token, payload);
    }

    @Post('get')
    @HttpCode(200)
    async get(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = ExecutionSession.API.Get.Request.parse(body);
        return await this.executionSessionService.get(req.token, payload);
    }

    @Post('update')
    @HttpCode(200)
    async update(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = ExecutionSession.API.Update.Request.parse(body);
        return await this.executionSessionService.update(req.token, payload);
    }
}
