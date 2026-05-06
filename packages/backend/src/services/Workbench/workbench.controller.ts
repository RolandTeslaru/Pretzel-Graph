import { Controller, UseGuards, Get, Post, Param, Body, Req, HttpCode } from '@nestjs/common';
import { WorkbenchService } from './workbench.service';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { Workflow, Workbench } from '@pretzel-graph/shared/domain';

@Controller('workbench')
@UseGuards(SupabaseAuthGuard)
export class WorkbenchController {
    constructor(private readonly workbenchService: WorkbenchService) { }

    @Post('workflows')
    @HttpCode(200)
    async createWorkflow(@Req() req: AuthenticatedRequest, @Body() body: Workbench.API.Workflow.Create.Request) {
        const payload = Workbench.API.Workflow.Create.Request.parse(body);
        return await this.workbenchService.workflow.create(req.token, payload);
    }

    @Get('workflows/:id')
    async getWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: Workflow.Id) {
        return await this.workbenchService.workflow.get(req.token, id);
    }

    @Post('workflows/commit')
    @HttpCode(200)
    async commitWorkflow(@Req() req: AuthenticatedRequest, @Body() body: Workbench.API.Workflow.Commit.Request) {
        const payload = Workbench.API.Workflow.Commit.Request.parse(body);
        return await this.workbenchService.workflow.commit(req.token, payload);
    }

    @Get('dependencies/workflows/:workflowId')
    async resolveWorkflowDependency(@Req() req: AuthenticatedRequest, @Param('workflowId') workflowId: string) {
        const payload = Workbench.API.Dependency.ResolveWorkflow.Request.parse({ workflowId });
        return await this.workbenchService.dependency.resolveWorkflow(req.token, payload);
    }
}
