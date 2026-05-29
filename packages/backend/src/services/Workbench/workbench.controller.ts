import { Controller, UseGuards, Get, Post, Param, Body, Req, HttpCode } from '@nestjs/common';
import { WorkbenchService } from './workbench.service';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { Workflow, Workbench } from '@pretzel-graph/shared/domain';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('workbench')
@UseGuards(SupabaseAuthGuard)
export class WorkbenchController {
    constructor(private readonly workbenchService: WorkbenchService) { }

    @Post('workflows')
    @HttpCode(200)
    async createWorkflow(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Workbench.API.Workflow.Create.Request) body: Workbench.API.Workflow.Create.Request,
    ) {
        return await this.workbenchService.workflow.create(req.token, body);
    }

    @Get('workflows/:id')
    async getWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: Workflow.Id) {
        return await this.workbenchService.workflow.get(req.token, id);
    }

    @Post('workflows/commit')
    @HttpCode(200)
    async commitWorkflow(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Workbench.API.Workflow.Commit.Request) body: Workbench.API.Workflow.Commit.Request,
    ) {
        return await this.workbenchService.workflow.commit(req.token, body);
    }

    @Get('dependencies/workflows/:dependencyId/published')
    async loadPublishedDependency(
        @Req() req: AuthenticatedRequest, 
        @Param('dependencyId') dependencyId: Workflow.Id
    ) {
        const payload = Workbench.API.Dependency.Published.Load.Request.parse({ dependencyId });
        return await this.workbenchService.dependency.published.load(req.token, payload);
    }

    @Get('dependencies/workflows/:dependencyId/draft')
    async loadDraftDependency(
        @Req() req: AuthenticatedRequest, 
        @Param('dependencyId') dependencyId: Workflow.Id
    ) {
        const payload = Workbench.API.Dependency.Draft.Load.Request.parse({ dependencyId });
        return await this.workbenchService.dependency.draft.load(req.token, payload);
    }

    @Post('dependencies/check-updates')
    @HttpCode(200)
    async checkPublishedDependencyUpdates(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Workbench.API.Dependency.Published.CheckUpdates.Request) body: Workbench.API.Dependency.Published.CheckUpdates.Request,
    ) {
        return await this.workbenchService.dependency.published.checkUpdates(req.token, body);
    }

    @Post('dependencies/check-draft-updates')
    @HttpCode(200)
    async checkDraftDependencyUpdates(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Workbench.API.Dependency.Draft.CheckUpdates.Request) body: Workbench.API.Dependency.Draft.CheckUpdates.Request,
    ) {
        return await this.workbenchService.dependency.draft.checkUpdates(req.token, body);
    }

    @Post('field/resource-loader/load-options')
    @HttpCode(200)
    async loadResourceLoaderOptions(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Workbench.API.Field.ResourceLoader.LoadOptions.Request) body: Workbench.API.Field.ResourceLoader.LoadOptions.Request,
    ) {
        return await this.workbenchService.field.resourceLoader.loadOptions(req.token, body);
    }
}
