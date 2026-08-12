import { Controller, UseGuards, Get, Post, Param, HttpCode } from '@nestjs/common';
import { WorkbenchService } from './workbench.service';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { Workflow, Workbench } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';

@Controller('workbench')
@UseGuards(UserAuthGuard)
export class WorkbenchController {
    constructor(private readonly workbenchService: WorkbenchService) { }

    @Post('workflows')
    @HttpCode(200)
    async createWorkflow(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Workbench.API.Workflow.Create.Request) body: Workbench.API.Workflow.Create.Request,
    ) {
        return await this.workbenchService.workflow.create(principal, body);
    }

    @Get('workflows/:id')
    async getWorkflow(@AuthenticatedUser() principal: Principal.User, @Param('id') id: Workflow.Id) {
        return await this.workbenchService.workflow.get(principal, id);
    }

    @Post('workflows/commit')
    @HttpCode(200)
    async commitWorkflow(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Workbench.API.Workflow.Commit.Request) body: Workbench.API.Workflow.Commit.Request,
    ) {
        return await this.workbenchService.workflow.commit(principal, body);
    }

    @Get('dependencies/workflows/:dependencyId/published')
    async loadPublishedDependency(
        @AuthenticatedUser() principal: Principal.User,
        @Param('dependencyId') dependencyId: Workflow.Id
    ) {
        const payload = Workbench.API.Dependency.Published.Load.Request.parse({ dependencyId });
        return await this.workbenchService.dependency.published.load(principal, payload);
    }

    @Get('dependencies/workflows/:dependencyId/draft')
    async loadDraftDependency(
        @AuthenticatedUser() principal: Principal.User,
        @Param('dependencyId') dependencyId: Workflow.Id
    ) {
        const payload = Workbench.API.Dependency.Draft.Load.Request.parse({ dependencyId });
        return await this.workbenchService.dependency.draft.load(principal, payload);
    }

    @Post('dependencies/check-updates')
    @HttpCode(200)
    async checkPublishedDependencyUpdates(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Workbench.API.Dependency.Published.CheckUpdates.Request) body: Workbench.API.Dependency.Published.CheckUpdates.Request,
    ) {
        return await this.workbenchService.dependency.published.checkUpdates(principal, body);
    }

    @Post('dependencies/check-draft-updates')
    @HttpCode(200)
    async checkDraftDependencyUpdates(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Workbench.API.Dependency.Draft.CheckUpdates.Request) body: Workbench.API.Dependency.Draft.CheckUpdates.Request,
    ) {
        return await this.workbenchService.dependency.draft.checkUpdates(principal, body);
    }

    @Post('field/resource-loader/load-options')
    @HttpCode(200)
    async loadResourceLoaderOptions(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Workbench.API.Field.ResourceLoader.LoadOptions.Request) body: Workbench.API.Field.ResourceLoader.LoadOptions.Request,
    ) {
        return await this.workbenchService.field.resourceLoader.loadOptions(principal, body);
    }
}
