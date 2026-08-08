import { Controller, Post, Get, Delete, Param, UseGuards, HttpCode } from '@nestjs/common';
import { VersionControl } from '@pretzel-graph/shared/domain';
import { VersionControlService } from './version-control.service';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { CurrentUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('version-control')
@UseGuards(UserAuthGuard)
export class VersionControlController {
    constructor(private readonly service: VersionControlService) {}

    @Post('publish')
    @HttpCode(200)
    async publish(
        @CurrentUser() principal: Principal.User,
        @ZodBody(VersionControl.API.Publish.Request) body: VersionControl.API.Publish.Request,
    ) {
        return this.service.publish(principal, body);
    }

    @Get('list/:workflowId')
    async list(
        @CurrentUser() principal: Principal.User,
        @Param('workflowId') workflowId: string,
    ) {
        const payload = VersionControl.API.List.Request.parse({ workflowId });
        return this.service.list(principal, payload);
    }

    @Get('active')
    async listActiveWorkflows(@CurrentUser() principal: Principal.User) {
        return this.service.listActiveWorkflows(principal);
    }

    @Get('active/:workflowId')
    async getActiveByWorkflow(
        @CurrentUser() principal: Principal.User,
        @Param('workflowId') workflowId: string,
    ) {
        const payload = VersionControl.API.GetActiveByWorkflow.Request.parse({ workflowId });
        return this.service.getActiveByWorkflow(principal, payload);
    }

    @Get(':publicationId')
    async get(
        @CurrentUser() principal: Principal.User,
        @Param('publicationId') publicationId: string,
    ) {
        const payload = VersionControl.API.Get.Request.parse({ publicationId });
        return this.service.get(principal, payload);
    }

    @Post(':publicationId/activate')
    @HttpCode(200)
    async activate(
        @CurrentUser() principal: Principal.User,
        @Param('publicationId') publicationId: string,
    ) {
        const payload = VersionControl.API.Activate.Request.parse({ publicationId });
        return this.service.activate(principal, payload);
    }

    @Post(':publicationId/deactivate')
    @HttpCode(200)
    async deactivate(
        @CurrentUser() principal: Principal.User,
        @Param('publicationId') publicationId: string,
    ) {
        const payload = VersionControl.API.Deactivate.Request.parse({ publicationId });
        return this.service.deactivate(principal, payload);
    }

    @Delete(':publicationId')
    async remove(
        @CurrentUser() principal: Principal.User,
        @Param('publicationId') publicationId: string,
    ) {
        const payload = VersionControl.API.Remove.Request.parse({ publicationId });
        return this.service.remove(principal, payload);
    }
}
