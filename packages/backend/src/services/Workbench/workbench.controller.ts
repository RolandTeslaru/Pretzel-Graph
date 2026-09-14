import { Controller, UseGuards, Get, Post, Param, HttpCode } from '@nestjs/common';
import { WorkbenchService } from './workbench.service';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { MemberOrDelegateGuard } from '../../auth/member-or-delegate.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { Workflow, Workbench } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';

@Controller('workbench')
export class WorkbenchController {
    constructor(private readonly workbenchService: WorkbenchService) { }

    @Post('workflows')
    @UseGuards(MemberAuthGuard)
    @HttpCode(200)
    async createWorkflow(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Workbench.API.Workflow.Create.Request) body: Workbench.API.Workflow.Create.Request,
    ) {
        return await this.workbenchService.workflow.create(principal, body);
    }

    @Get('workflows/:id')
    @UseGuards(MemberOrDelegateGuard)
    async getWorkflow(@AuthenticatedUser() principal: Principal.User, @Param('id') id: Workflow.Id) {
        return await this.workbenchService.workflow.get(principal, id);
    }

    @Post('workflows/commit')
    @UseGuards(MemberAuthGuard)
    @HttpCode(200)
    async commitWorkflow(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Workbench.API.Workflow.Commit.Request) body: Workbench.API.Workflow.Commit.Request,
    ) {
        return await this.workbenchService.workflow.commit(principal, body);
    }

    @Post('field/resource-loader/load-options')
    @UseGuards(MemberAuthGuard)
    @HttpCode(200)
    async loadResourceLoaderOptions(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Workbench.API.Field.ResourceLoader.LoadOptions.Request) body: Workbench.API.Field.ResourceLoader.LoadOptions.Request,
    ) {
        return await this.workbenchService.field.resourceLoader.loadOptions(principal, body);
    }
}
