import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { Orchestrator } from '@vx-agent-editor/shared/domain';
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
        return await this.orchestratorService.run(req.token, payload);
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

    
    @Post('terminate')
    @HttpCode(200)
    async terminate(
        @Req() req: AuthenticatedRequest, 
        @Body() body: any
    ) {
        const payload = Orchestrator.API.Terminate.Request.parse(body);
        return await this.orchestratorService.terminate(req.token, payload);
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
