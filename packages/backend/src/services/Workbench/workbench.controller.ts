import { Controller, UseGuards, Get, Post, Param, Body, Req, HttpCode } from '@nestjs/common';
import { WorkbenchService } from './workbench.service';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { Workflow, Workbench } from '@vx-agent-editor/shared/domain';

@Controller('workbench')
@UseGuards(SupabaseAuthGuard)
export class WorkbenchController {
    constructor(private readonly workbenchService: WorkbenchService) { }

    @Get('workflows/:id')
    async getWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: Workflow.Id) {
        return await this.workbenchService.workflow.get(req.token, id);
    }

    @Post('workflows/commit')
    @HttpCode(200)
    async commitWorkflow(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Workbench.API.Workflow.Commit.Request.parse(body);
        return await this.workbenchService.workflow.commit(req.token, payload);
    }
}
