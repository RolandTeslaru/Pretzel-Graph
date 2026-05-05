import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, HttpCode } from '@nestjs/common';
import { VersionControl } from '@pretzel-graph/shared/domain';
import { VersionControlService } from './version-control.service';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('version-control')
@UseGuards(SupabaseAuthGuard)
export class VersionControlController {
    constructor(private readonly service: VersionControlService) {}

    @Post('publish')
    @HttpCode(200)
    async publish(
        @Req() req: AuthenticatedRequest,
        @Body() body: VersionControl.API.Publish.Request,
    ) {
        const payload = VersionControl.API.Publish.Request.parse(body);
        return this.service.publish(req.token, payload);
    }

    @Get('list/:workflowId')
    async list(
        @Req() req: AuthenticatedRequest,
        @Param('workflowId') workflowId: string,
    ) {
        const payload = VersionControl.API.List.Request.parse({ workflowId });
        return this.service.list(req.token, payload);
    }

    @Get('active')
    async listActive(
        @Req() req: AuthenticatedRequest,
    ) {
        return this.service.listActive(req.token);
    }

    @Get(':publicationId')
    async get(
        @Req() req: AuthenticatedRequest,
        @Param('publicationId') publicationId: string,
    ) {
        const payload = VersionControl.API.Get.Request.parse({ publicationId });
        return this.service.get(req.token, payload);
    }

    @Post(':publicationId/activate')
    @HttpCode(200)
    async activate(
        @Req() req: AuthenticatedRequest,
        @Param('publicationId') publicationId: string,
    ) {
        const payload = VersionControl.API.Activate.Request.parse({ publicationId });
        return this.service.activate(req.token, payload);
    }

    @Post(':publicationId/deactivate')
    @HttpCode(200)
    async deactivate(
        @Req() req: AuthenticatedRequest,
        @Param('publicationId') publicationId: string,
    ) {
        const payload = VersionControl.API.Deactivate.Request.parse({ publicationId });
        return this.service.deactivate(req.token, payload);
    }

    @Delete(':publicationId')
    async remove(
        @Req() req: AuthenticatedRequest,
        @Param('publicationId') publicationId: string,
    ) {
        const payload = VersionControl.API.Remove.Request.parse({ publicationId });
        return this.service.remove(req.token, payload);
    }
}
