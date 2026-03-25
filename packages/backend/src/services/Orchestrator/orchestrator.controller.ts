import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { Auth, Orchestrator } from '@vx-agent-editor/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('orchestrator')
@UseGuards(SupabaseAuthGuard)
export class OrchestratorController {
    constructor(private readonly orchestratorService: OrchestratorService) { }


    @Post('run')
    @HttpCode(200)
    async run(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Run.Request.parse(body);
        return await this.orchestratorService.run(req.token, req.user.id as Auth.User.Id, payload);
    }


    @Post('pause')
    @HttpCode(200)
    async pause(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Pause.Request.parse(body);
        return await this.orchestratorService.pause(req.token, payload);
    }


    @Post('resume')
    @HttpCode(200)
    async resume(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Resume.Request.parse(body);
        return await this.orchestratorService.resume(req.token, payload);
    }


    @Post('heartbeat')
    @HttpCode(200)
    async heartbeat(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Heartbeat.Request.parse(body);
        return await this.orchestratorService.heartbeat(payload);
    }


    @Post('suspend')
    @HttpCode(200)
    async suspend(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Suspend.Request.parse(body);
        return await this.orchestratorService.suspend(req.token, payload);
    }


    @Post('terminate')
    @HttpCode(200)
    async terminate(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Terminate.Request.parse(body);
        return await this.orchestratorService.terminate(req.token, payload);
    }


    @Post('list-active')
    @HttpCode(200)
    async listActive(
        @Req() req: AuthenticatedRequest,
    ) {
        return await this.orchestratorService.listActive(req.token, req.user.id as Auth.User.Id);
    }


    @Post('terminate-all')
    @HttpCode(200)
    async terminateAll(
        @Req() req: AuthenticatedRequest,
    ) {
        return await this.orchestratorService.terminateAll(req.token, req.user.id as Auth.User.Id);
    }


    @Post('finalise')
    @HttpCode(200)
    async finalise(
        @Req() req: AuthenticatedRequest,
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Finalise.Request.parse(body);
        return await this.orchestratorService.finalise(req.token, payload);
    }
}
