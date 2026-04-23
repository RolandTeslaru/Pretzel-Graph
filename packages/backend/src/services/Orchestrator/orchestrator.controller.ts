import { Controller, Post, Body, UseGuards, Req, HttpCode, Get, Param } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { Auth, Orchestrator } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { InternalAuthGuard, InternalAuthenticatedRequest } from '../../auth/internal-auth.guard';

@Controller('orchestrator')
export class OrchestratorController {
    constructor(private readonly orchestratorService: OrchestratorService) { }


    @Post('run')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async run(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Run.Request.parse(body);
        return await this.orchestratorService.runFromUser(req.token, req.user.id as Auth.User.Id, payload);
    }


    @Post('internal/run')
    @UseGuards(InternalAuthGuard)
    @HttpCode(200)
    async runInternal(
        @Req() req: InternalAuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Run.InternalRequest.parse(body);

        return await this.orchestratorService.runFromService(payload, {
            type: 'service',
            service: req.internal.service,
        });
    }


    @Get('await-result/:jobId')
    @UseGuards(SupabaseAuthGuard)
    async awaitResult(
        @Req() req: AuthenticatedRequest,
        @Param('jobId') jobId: string
    ) {
        return await this.orchestratorService.awaitResult(
            req.token,
            req.user.id as Auth.User.Id,
            { jobId: jobId as Orchestrator.Job.Id }
        );
    }


    @Post('pause')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async pause(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Pause.Request.parse(body);
        return await this.orchestratorService.pause(req.token, payload);
    }


    @Post('resume')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async resume(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Resume.Request.parse(body);
        return await this.orchestratorService.resume(req.token, payload);
    }


    @Post('heartbeat')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async heartbeat(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Heartbeat.Request.parse(body);
        return await this.orchestratorService.heartbeat(payload);
    }


    @Post('suspend')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async suspend(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Suspend.Request.parse(body);
        return await this.orchestratorService.suspend(req.token, payload);
    }


    @Post('terminate')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async terminate(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Terminate.Request.parse(body);
        return await this.orchestratorService.terminate(req.token, payload);
    }


    @Post('list-active')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async listActive(
        @Req() req: AuthenticatedRequest,
    ) {
        return await this.orchestratorService.listActive(req.token, req.user.id as Auth.User.Id);
    }


    @Post('terminate-all')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async terminateAll(
        @Req() req: AuthenticatedRequest,
    ) {
        return await this.orchestratorService.terminateAll(req.token, req.user.id as Auth.User.Id);
    }


    @Post('finalise')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async finalise(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Finalise.Request.parse(body);
        return await this.orchestratorService.finalise(req.token, payload);
    }
}
