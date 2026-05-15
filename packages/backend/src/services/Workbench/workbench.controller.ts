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

    @Get('dependencies/workflows/:dependencyId')
    async loadWorkflowDependency(@Req() req: AuthenticatedRequest, @Param('dependencyId') dependencyId: string) {
        const payload = Workbench.API.Dependency.Load.Request.parse({ dependencyId });
        return await this.workbenchService.dependency.load(req.token, payload);
    }

    @Post('dependencies/check-updates')
    @HttpCode(200)
    async checkDependencyUpdates(@Req() req: AuthenticatedRequest, @Body() body: Workbench.API.Dependency.CheckUpdates.Request) {
        const payload = Workbench.API.Dependency.CheckUpdates.Request.parse(body);
        return await this.workbenchService.dependency.checkUpdates(req.token, payload);
    }
}
