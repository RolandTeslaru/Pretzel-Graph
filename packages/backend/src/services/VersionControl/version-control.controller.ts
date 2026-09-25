import { Controller, Post, Get, Delete, UseGuards, HttpCode } from '@nestjs/common';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { VersionControlService } from './version-control.service';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { WorkflowIdParam } from '@/decorators/scope';
import { Principal } from '@/domain/Principal';
import { ZodBody, ZodParam } from '@pretzel-graph/shared/server/pipes/zod.pipe';

@Controller('version-control')
@UseGuards(MemberAuthGuard)
export class VersionControlController {
    constructor(private readonly service: VersionControlService) {}

    @Post(':workflowId/publish')
    @HttpCode(200)
    async publish(
        @AuthenticatedUser() principal: Principal.User,
        @WorkflowIdParam() workflowId: Workflow.Id,
        @ZodBody(VersionControl.API.Publish.Request) body: VersionControl.API.Publish.Request,
    ) {
        return this.service.publish(principal, workflowId, body);
    }

    @Get('list/:workflowId')
    async list(
        @AuthenticatedUser() principal: Principal.User,
        @ZodParam('workflowId', Workflow.Id) workflowId: Workflow.Id,
    ) {
        return this.service.list(principal, workflowId);
    }

    @Get(':publicationId')
    async get(
        @AuthenticatedUser() principal: Principal.User,
        @ZodParam('publicationId', VersionControl.Publication.Id) publicationId: VersionControl.Publication.Id,
    ) {
        return this.service.get(principal, publicationId);
    }

    @Delete(':workflowId/:publicationId')
    async remove(
        @AuthenticatedUser() principal: Principal.User,
        @ZodParam('publicationId', VersionControl.Publication.Id) publicationId: VersionControl.Publication.Id,
    ) {
        return this.service.remove(principal, publicationId);
    }
}
