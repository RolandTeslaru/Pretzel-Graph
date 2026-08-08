import { Controller, Post, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { Auth, Execution } from '@pretzel-graph/shared/domain';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { InternalAuthGuard, InternalAuthenticatedRequest } from '../../auth/internal-auth.guard';
import { ApiKeyAuthGuard, ApiKeyAuthenticatedRequest } from '../../auth/api-key-auth.guard';
import { CurrentUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('execution')
export class ExecutionController {
    constructor(private readonly executionService: ExecutionService) {}

    @Post('run')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async run(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Run.Request) body: Execution.API.Run.Request,
    ) {
        return this.executionService.runFromUser(principal, body);
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
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async pause(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Pause.Request) body: Execution.API.Pause.Request,
    ) {
        return this.executionService.pause(principal, body);
    }

    @Post('resume')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async resume(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Resume.Request) body: Execution.API.Resume.Request,
    ) {
        return this.executionService.resume(principal, body);
    }

    @Post('heartbeat')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async heartbeat(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Heartbeat.Request) body: Execution.API.Heartbeat.Request,
    ) {
        return this.executionService.heartbeat(principal, body);
    }

    @Post('suspend')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async suspend(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Suspend.Request) body: Execution.API.Suspend.Request,
    ) {
        return this.executionService.suspend(principal, body);
    }

    @Post('terminate')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async terminate(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Terminate.Request) body: Execution.API.Terminate.Request,
    ) {
        return this.executionService.terminate(principal, body);
    }

    @Post('terminate-all')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async terminateAll(@CurrentUser() principal: Principal.User) {
        return this.executionService.terminateAll(principal);
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
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async get(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Get.Request) body: Execution.API.Get.Request,
    ) {
        return this.executionService.get(principal, body);
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
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async metaList(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Meta.List.Request) body: Execution.API.Meta.List.Request,
    ) {
        return this.executionService.meta.list(principal, body);
    }

    @Post('meta/get')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async metaGet(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Meta.Get.Request) body: Execution.API.Meta.Get.Request,
    ) {
        return this.executionService.meta.get(principal, body);
    }

    @Post('meta/list-active')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async metaListActive(@CurrentUser() principal: Principal.User) {
        return this.executionService.meta.listActive(principal);
    }

    // DISABLED — route intentionally unregistered, do not restore as-is.
    //
    // runFromSdk loads the published workflow by id with no ownership check
    // (execution.database.ts getActivePublishedWorkflowData filters on
    // workflow_id + is_active only) and then runs it under a service-role
    // handle, so credential resolution is RLS-free. Any API key holder could
    // therefore execute another user's workflow with that user's credentials
    // and read the output. Unreachable today only because no API keys exist.
    //
    // Before re-enabling, decide what this endpoint is for:
    //   - "run my own workflows" -> add ownership.assertWorkflow(workflowId, userId)
    //     ahead of the load, mirroring runFromUser
    //   - "let others invoke my published workflow" -> the assert is wrong; needs
    //     a consent model and the caller's own credentials, not the owner's
    //
    // @Post('sdk/run')
    // @UseGuards(ApiKeyAuthGuard)
    // @HttpCode(200)
    // async sdkRun(
    //     @Req() req: ApiKeyAuthenticatedRequest,
    //     @ZodBody(Execution.API.SdkRun.Request) body: Execution.API.SdkRun.Request,
    // ) {
    //     return this.executionService.runFromSdk(req.user.id as Auth.User.Id, body);
    // }

    @Post('recording/get-live')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async recordingGetLive(
        @CurrentUser() principal: Principal.User,
        @ZodBody(Execution.API.Recording.GetLive.Request) body: Execution.API.Recording.GetLive.Request,
    ) {
        return this.executionService.recording.getLive(principal, body);
    }
}
