import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, Param } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { Auth, Execution } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { InternalAuthGuard, InternalAuthenticatedRequest } from '../../auth/internal-auth.guard';

@Controller('execution')
export class ExecutionController {
    constructor(private readonly executionService: ExecutionService) {}

    @Post('run')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async run(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Run.Request.parse(body);
        return this.executionService.runFromUser(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('internal/run')
    @UseGuards(InternalAuthGuard)
    @HttpCode(200)
    async runInternal(@Req() req: InternalAuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Run.InternalRequest.parse(body);
        return this.executionService.runFromService(payload, req.internal.service);
    }

    @Get('await-result/:executionId')
    @UseGuards(SupabaseAuthGuard)
    async awaitResult(@Req() req: AuthenticatedRequest, @Param('executionId') executionId: string) {
        return this.executionService.awaitResult(
            req.token,
            req.user.id as Auth.User.Id,
            { executionId: executionId as Execution.Id }
        );
    }

    @Post('pause')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async pause(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Pause.Request.parse(body);
        return this.executionService.pause(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('resume')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async resume(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Resume.Request.parse(body);
        return this.executionService.resume(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('heartbeat')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async heartbeat(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Heartbeat.Request.parse(body);
        return this.executionService.heartbeat(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('suspend')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async suspend(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Suspend.Request.parse(body);
        return this.executionService.suspend(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('terminate')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async terminate(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Terminate.Request.parse(body);
        return this.executionService.terminate(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('terminate-all')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async terminateAll(@Req() req: AuthenticatedRequest) {
        return this.executionService.terminateAll(req.token, req.user.id as Auth.User.Id);
    }

    @Post('finalise')
    @UseGuards(InternalAuthGuard)
    @HttpCode(200)
    async finalise(@Body() body: any) {
        const payload = Execution.API.Finalise.Request.parse(body);
        return this.executionService.finalise(payload);
    }

    @Post('get')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async get(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Get.Request.parse(body);
        return this.executionService.get(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('update')
    @UseGuards(InternalAuthGuard)
    @HttpCode(200)
    async update(@Body() body: any) {
        const payload = Execution.API.Update.Request.parse(body);
        return this.executionService.update(payload);
    }

    @Post('meta/list')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async metaList(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Meta.List.Request.parse(body);
        return this.executionService.meta.list(req.token, payload);
    }

    @Post('meta/get')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async metaGet(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Execution.API.Meta.Get.Request.parse(body);
        return this.executionService.meta.get(req.token, req.user.id as Auth.User.Id, payload);
    }

    @Post('meta/list-active')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async metaListActive(@Req() req: AuthenticatedRequest) {
        return this.executionService.meta.listActive(req.token, req.user.id as Auth.User.Id);
    }
}
