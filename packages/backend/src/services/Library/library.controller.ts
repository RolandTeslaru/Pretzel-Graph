import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Req, HttpCode } from '@nestjs/common';
import { LibraryService } from './library.service';
import { Library, Workflow } from '@vx-agent-editor/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('library')
@UseGuards(SupabaseAuthGuard)
export class LibraryController {
    constructor(private readonly libraryService: LibraryService) { }

    // ── Projects ──────────────────────────────────────────
    @Post('projects')
    @HttpCode(200)
    async createProject(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Library.API.Project.Create.Request.parse(body);
        return await this.libraryService.createProject(req.token, payload);
    }

    @Get('projects')
    async listProjects(@Req() req: AuthenticatedRequest) {
        return await this.libraryService.listProjects(req.token);
    }

    @Delete('projects/:id')
    async deleteProject(@Req() req: AuthenticatedRequest, @Param('id') id: Library.Project.Id) {
        return await this.libraryService.deleteProject(req.token, id);
    }


    // ── Folders ───────────────────────────────────────────
    @Post('folders')
    @HttpCode(200)
    async createFolder(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Library.API.Folder.Create.Request.parse(body);
        return await this.libraryService.createFolder(req.token, payload);
    }

    @Get('folders')
    async listFolders(
        @Req() req: AuthenticatedRequest,
        @Query('projectId') projectId?: Library.Project.Id,
    ) {
        return await this.libraryService.listFolders(req.token, projectId);
    }

    @Delete('folders/:id')
    async deleteFolder(@Req() req: AuthenticatedRequest, @Param('id') id: Library.Folder.Id) {
        return await this.libraryService.deleteFolder(req.token, id);
    }


    // ── Workflows ─────────────────────────────────────────
    @Post('workflows')
    @HttpCode(200)
    async createWorkflow(@Req() req: AuthenticatedRequest, @Body() body: any) {
        const payload = Library.API.Workflow.Create.Request.parse(body);
        return await this.libraryService.createWorkflow(req.token, payload);
    }

    @Get('workflows/:id')
    async getWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: Workflow.Id) {
        return await this.libraryService.getWorkflow(req.token, id);
    }

    @Get('workflows')
    async listWorkflows(
        @Req() req: AuthenticatedRequest,
        @Query('folderId') folderId?: Library.Folder.Id,
    ) {
        return await this.libraryService.listWorkflows(req.token, folderId);
    }

    @Delete('workflows/:id')
    async deleteWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: Workflow.Id) {
        return await this.libraryService.deleteWorkflow(req.token, id);
    }
}
