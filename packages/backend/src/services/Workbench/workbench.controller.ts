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

    @Get('dependencies/workflows/:dependencyId/published')
    async loadPublishedDependency(@Req() req: AuthenticatedRequest, @Param('dependencyId') dependencyId: string) {
        const payload = Workbench.API.Dependency.Published.Load.Request.parse({ dependencyId });
        return await this.workbenchService.dependency.loadPublished(req.token, payload);
    }

    @Get('dependencies/workflows/:dependencyId/draft')
    async loadDraftDependency(@Req() req: AuthenticatedRequest, @Param('dependencyId') dependencyId: string) {
        const payload = Workbench.API.Dependency.Draft.Load.Request.parse({ dependencyId });
        return await this.workbenchService.dependency.loadDraft(req.token, payload);
    }

    @Post('dependencies/check-updates')
    @HttpCode(200)
    async checkPublishedDependencyUpdates(@Req() req: AuthenticatedRequest, @Body() body: Workbench.API.Dependency.Published.CheckUpdates.Request) {
        const payload = Workbench.API.Dependency.Published.CheckUpdates.Request.parse(body);
        return await this.workbenchService.dependency.checkPublishedUpdates(req.token, payload);
    }

    @Post('dependencies/check-draft-updates')
    @HttpCode(200)
    async checkDraftDependencyUpdates(@Req() req: AuthenticatedRequest, @Body() body: Workbench.API.Dependency.Draft.CheckUpdates.Request) {
        const payload = Workbench.API.Dependency.Draft.CheckUpdates.Request.parse(body);
        return await this.workbenchService.dependency.checkDraftUpdates(req.token, payload);
    }
}
