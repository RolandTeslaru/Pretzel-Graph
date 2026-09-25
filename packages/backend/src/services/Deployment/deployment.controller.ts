import { Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { WorkflowIdParam } from '@/decorators/scope';
import { Principal } from '@/domain/Principal';
import { ZodParam } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { DeploymentService } from './deployment.service';

@Controller('deployment')
@UseGuards(MemberAuthGuard)
export class DeploymentController {
    constructor(private readonly service: DeploymentService) {}

    @Get()
    async list(@AuthenticatedUser() principal: Principal.User) {
        return this.service.list(principal);
    }

    @Get(':workflowId')
    async get(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
    ) {
        return this.service.get(principal, workflowId);
    }

    @Post(':workflowId')
    @HttpCode(200)
    async deployWorkflow(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
    ) {
        return this.service.deployWorkflow(principal, workflowId);
    }

    @Post(':workflowId/:publicationId')
    @HttpCode(200)
    async deployPublication(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
        @ZodParam('publicationId', VersionControl.Publication.Id) publicationId: VersionControl.Publication.Id,
    ) {
        return this.service.deployPublication(principal, workflowId, publicationId);
    }

    @Delete(':workflowId')
    async undeploy(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
    ) {
        return this.service.undeploy(principal, workflowId);
    }
}
