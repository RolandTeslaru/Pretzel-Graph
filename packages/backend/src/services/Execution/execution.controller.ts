import { Controller, Post, Get, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { Auth, Execution } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { InternalAuthGuard, InternalAuthenticatedRequest } from '../../auth/internal-auth.guard';
import { ApiKeyAuthGuard, ApiKeyAuthenticatedRequest } from '../../auth/api-key-auth.guard';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('execution')
export class ExecutionController {
    constructor(private readonly executionService: ExecutionService) {}

    @Post('run')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async run(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Run.Request) body: Execution.API.Run.Request,
    ) {
        return this.executionService.runFromUser(req.token, req.user.id as Auth.User.Id, body);
    }

    @Post('internal/run')
    @UseGuards(InternalAuthGuard)
    @HttpCode(200)
    async runInternal(
        @Req() req: InternalAuthenticatedRequest,
        @ZodBody(Execution.API.Run.InternalRequest) body: Execution.API.Run.InternalRequest,
    ) {
        return this.executionService.runFromService(body, req.internal.service);
    }

    @Post('pause')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async pause(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Pause.Request) body: Execution.API.Pause.Request,
    ) {
        return this.executionService.pause(req.token, req.user.id as Auth.User.Id, body);
    }

    @Post('resume')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async resume(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Resume.Request) body: Execution.API.Resume.Request,
    ) {
        return this.executionService.resume(req.token, req.user.id as Auth.User.Id, body);
    }

    @Post('heartbeat')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async heartbeat(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Heartbeat.Request) body: Execution.API.Heartbeat.Request,
    ) {
        return this.executionService.heartbeat(req.token, req.user.id as Auth.User.Id, body);
    }

    @Post('suspend')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async suspend(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Suspend.Request) body: Execution.API.Suspend.Request,
    ) {
        return this.executionService.suspend(req.token, req.user.id as Auth.User.Id, body);
    }

    @Post('terminate')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async terminate(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Terminate.Request) body: Execution.API.Terminate.Request,
    ) {
        return this.executionService.terminate(req.token, req.user.id as Auth.User.Id, body);
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
    async finalise(
        @ZodBody(Execution.API.Finalise.Request) body: Execution.API.Finalise.Request,
    ) {
        return this.executionService.finalise(body);
    }

    @Post('get')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async get(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Get.Request) body: Execution.API.Get.Request,
    ) {
        return this.executionService.get(req.token, req.user.id as Auth.User.Id, body);
    }

    @Post('update')
    @UseGuards(InternalAuthGuard)
    @HttpCode(200)
    async update(
        @ZodBody(Execution.API.Update.Request) body: Execution.API.Update.Request,
    ) {
        return this.executionService.update(body);
    }

    @Post('meta/list')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async metaList(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Meta.List.Request) body: Execution.API.Meta.List.Request,
    ) {
        return this.executionService.meta.list(req.token, body);
    }

    @Post('meta/get')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async metaGet(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Meta.Get.Request) body: Execution.API.Meta.Get.Request,
    ) {
        return this.executionService.meta.get(req.token, req.user.id as Auth.User.Id, body);
    }

    @Post('meta/list-active')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async metaListActive(@Req() req: AuthenticatedRequest) {
        return this.executionService.meta.listActive(req.token, req.user.id as Auth.User.Id);
    }

    @Post('sdk/run')
    @UseGuards(ApiKeyAuthGuard)
    @HttpCode(200)
    async sdkRun(
        @Req() req: ApiKeyAuthenticatedRequest,
        @ZodBody(Execution.API.SdkRun.Request) body: Execution.API.SdkRun.Request,
    ) {
        return this.executionService.runFromSdk(req.user.id as Auth.User.Id, body);
    }

    @Post('recording/get-live')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async recordingGetLive(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Execution.API.Recording.GetLive.Request) body: Execution.API.Recording.GetLive.Request,
    ) {
        return this.executionService.recording.getLive(req.token, req.user.id as Auth.User.Id, body);
    }
}
