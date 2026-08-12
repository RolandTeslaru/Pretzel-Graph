import { Controller, Post, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { Execution, Workflow } from '@pretzel-graph/shared/domain';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { InternalAuthGuard, InternalAuthenticatedRequest } from '../../auth/internal-auth.guard';
import { Scoped } from '../../auth/scoped.decorator';
import { AuthenticatedUser } from '@/decorators/principal';
import { ExecutionIdParam, WorkflowIdParam } from '@/decorators/scope';
import { Principal } from '@/domain/Principal';
import { ZodBody, ZodParam } from '../../pipes/zod.pipe';

@Controller('execution')
export class ExecutionController {
    constructor(private readonly executionService: ExecutionService) {}

    // Declared before :workflowId/run, which also matches "internal/run" with
    // workflowId = "internal". Routes resolve in declaration order.
    @Post('internal/run')
    @UseGuards(InternalAuthGuard)
    @HttpCode(200)
    async runInternal(
        @Req() req: InternalAuthenticatedRequest,
        @ZodBody(Execution.API.Run.InternalRequest) body: Execution.API.Run.InternalRequest,
    ) {
        return this.executionService.runFromService(body, req.internal.service);
    }

    @Post(':workflowId/run')
    @Scoped('workflow')
    @HttpCode(200)
    async run(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
        @ZodBody(Execution.API.Run.Request) body: Execution.API.Run.Request,
    ) {
        return this.executionService.runFromUser(principal, workflowId, body);
    }

    @Post(':executionId/pause')
    @Scoped('execution')
    @HttpCode(200)
    async pause(
        @AuthenticatedUser() principal: Principal.User,
        @ExecutionIdParam() executionId: Execution.Id,
    ) {
        return this.executionService.pause(principal, executionId);
    }

    @Post(':executionId/resume')
    @Scoped('execution')
    @HttpCode(200)
    async resume(
        @AuthenticatedUser() principal: Principal.User,
        @ExecutionIdParam() executionId: Execution.Id,
    ) {
        return this.executionService.resume(principal, executionId);
    }

    @Post(':executionId/heartbeat')
    @Scoped('execution')
    @HttpCode(200)
    async heartbeat(
        @AuthenticatedUser() principal: Principal.User,
        @ExecutionIdParam() executionId: Execution.Id,
    ) {
        return this.executionService.heartbeat(principal, executionId);
    }

    @Post(':executionId/suspend')
    @Scoped('execution')
    @HttpCode(200)
    async suspend(
        @AuthenticatedUser() principal: Principal.User,
        @ExecutionIdParam() executionId: Execution.Id,
    ) {
        return this.executionService.suspend(principal, executionId);
    }

    @Post(':executionId/terminate')
    @Scoped('execution')
    @HttpCode(200)
    async terminate(
        @AuthenticatedUser() principal: Principal.User,
        @ExecutionIdParam() executionId: Execution.Id,
    ) {
        return this.executionService.terminate(principal, executionId);
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

    @Post('update')
    @UseGuards(InternalAuthGuard)
    @HttpCode(200)
    async update(
        @ZodBody(Execution.API.Update.Request) body: Execution.API.Update.Request,
    ) {
        return this.executionService.update(body);
    }

    @Post(':workflowId/meta/list')
    @Scoped('workflow')
    @HttpCode(200)
    async metaList(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
    ) {
        return this.executionService.meta.list(principal, workflowId);
    }

    // Unscoped by design, like :executionId/get — an RLS-covered read.
    @Post(':executionId/meta/get')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async metaGet(
        @AuthenticatedUser() principal: Principal.User,
        @ZodParam('executionId', Execution.Id) executionId: Execution.Id,
    ) {
        return this.executionService.meta.get(principal, executionId);
    }

    @Post('meta/list-active')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async metaListActive(@AuthenticatedUser() principal: Principal.User) {
        return this.executionService.meta.listActive(principal);
    }

    // Unscoped by design: the read runs through RLS, which already confines it to the
    // caller's own executions.
    @Post(':executionId/get')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async get(
        @AuthenticatedUser() principal: Principal.User,
        @ZodParam('executionId', Execution.Id) executionId: Execution.Id,
    ) {
        return this.executionService.get(principal, executionId);
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

    @Post(':executionId/recording/get-live')
    @Scoped('execution')
    @HttpCode(200)
    async recordingGetLive(
        @ExecutionIdParam() executionId: Execution.Id,
    ) {
        return this.executionService.recording.getLive(executionId);
    }
}
