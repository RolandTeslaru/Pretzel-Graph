import { Controller, Post, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { Execution } from '@pretzel-graph/shared/domain';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { InternalAuthGuard, InternalAuthenticatedRequest } from '../../auth/internal-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('execution')
export class ExecutionController {
    constructor(private readonly executionService: ExecutionService) {}

    @Post('run')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async run(
        @AuthenticatedUser() principal: Principal.User,
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
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Execution.API.Pause.Request) body: Execution.API.Pause.Request,
    ) {
        return this.executionService.pause(principal, body);
    }

    @Post('resume')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async resume(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Execution.API.Resume.Request) body: Execution.API.Resume.Request,
    ) {
        return this.executionService.resume(principal, body);
    }

    @Post('heartbeat')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async heartbeat(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Execution.API.Heartbeat.Request) body: Execution.API.Heartbeat.Request,
    ) {
        return this.executionService.heartbeat(principal, body);
    }

    @Post('suspend')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async suspend(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Execution.API.Suspend.Request) body: Execution.API.Suspend.Request,
    ) {
        return this.executionService.suspend(principal, body);
    }

    @Post('terminate')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async terminate(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Execution.API.Terminate.Request) body: Execution.API.Terminate.Request,
    ) {
        return this.executionService.terminate(principal, body);
    }

    @Post('terminate-all')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async terminateAll(@AuthenticatedUser() principal: Principal.User) {
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
        @AuthenticatedUser() principal: Principal.User,
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
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Execution.API.Meta.List.Request) body: Execution.API.Meta.List.Request,
    ) {
        return this.executionService.meta.list(principal, body);
    }

    @Post('meta/get')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async metaGet(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Execution.API.Meta.Get.Request) body: Execution.API.Meta.Get.Request,
    ) {
        return this.executionService.meta.get(principal, body);
    }

    @Post('meta/list-active')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async metaListActive(@AuthenticatedUser() principal: Principal.User) {
        return this.executionService.meta.listActive(principal);
    }

    // REMOVED — there is no sdk/run route and no runFromSdk. Rebuild, don't restore.
    //
    // The old implementation loaded a published workflow by id with no ownership
    // check, then ran it under a service-role handle with the *caller* as owner —
    // so credential resolution was RLS-free and returned the publisher's secrets to
    // whoever held an API key. Unreachable in practice only because no keys exist.
    //
    // It was deleted rather than converted, because every run now acts as the
    // workflow owner and the SDK case is the one where caller and owner differ.
    // Nothing here can be made correct without first deciding what the endpoint is:
    //   - "run my own workflows"          -> assertWorkflow(workflowId, callerId),
    //                                        mirroring runFromUser
    //   - "let others invoke my workflow" -> a consent model, and whose credentials
    //                                        the run uses is the open question
    //
    // Execution.API.SdkRun still exists in shared as the wire contract.
    // See SPECS/delegated-execution-principal.md, "Open Questions".

    @Post('recording/get-live')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async recordingGetLive(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Execution.API.Recording.GetLive.Request) body: Execution.API.Recording.GetLive.Request,
    ) {
        return this.executionService.recording.getLive(principal, body);
    }
}
