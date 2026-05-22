import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, HttpCode, Patch } from '@nestjs/common';
import { LibraryService } from './library.service';
import { Library, Workflow } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('library')
@UseGuards(SupabaseAuthGuard)
export class LibraryController {
    constructor(private readonly libraryService: LibraryService) { }

    // ── Bootstrap ─────────────────────────────────────────
    @Get('bootstrap')
    async getBootstrap(@Req() req: AuthenticatedRequest) {
        return await this.libraryService.bootstrap.get(req.token);
    }

    // ── Projects ──────────────────────────────────────────
    @Post('projects')
    @HttpCode(200)
    async createProject(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Library.API.Project.Create.Request) body: Library.API.Project.Create.Request,
    ) {
        return await this.libraryService.project.create(req.token, body);
    }

    @Get('projects')
    async listProjects(@Req() req: AuthenticatedRequest) {
        return await this.libraryService.project.list(req.token);
    }

    @Patch('projects/:id')
    async updateProject(
        @Req() req: AuthenticatedRequest, 
        @Param('id') id: Library.Folder.Id, 
        @Body() body: Omit<Library.API.Project.Update.Request, 'id'>
    ) {
        const payload = Library.API.Project.Update.Request.parse({ ...body, id });
        return await this.libraryService.project.update(req.token, payload);
    }


    // ── Folders ───────────────────────────────────────────
    @Post('folders')
    @HttpCode(200)
    async createFolder(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Library.API.Folder.Create.Request) body: Library.API.Folder.Create.Request,
    ) {
        return await this.libraryService.folder.create(req.token, body);
    }

    @Patch('folders/:id')
    async updateFolder(@Req() req: AuthenticatedRequest, @Param('id') id: Library.Folder.Id, @Body() body: Omit<Library.API.Folder.Update.Request, 'id'>) {
        const payload = Library.API.Folder.Update.Request.parse({ ...body, id });
        return await this.libraryService.folder.update(req.token, payload);
    }

    @Delete('folders/:id')
    async deleteFolder(@Req() req: AuthenticatedRequest, @Param('id') id: Library.Folder.Id) {
        return await this.libraryService.folder.delete(req.token, id);
    }

    @Get('folders/:id/contents')
    async getFolderContents(@Req() req: AuthenticatedRequest, @Param('id') id: Library.Folder.Id) {
        return await this.libraryService.folder.getContents(req.token, id);
    }


    // ── Workflows ─────────────────────────────────────────
    @Post('workflows')
    @HttpCode(200)
    async createWorkflow(
        @Req() req: AuthenticatedRequest,
        @ZodBody(Library.API.Workflow.Create.Request) body: Library.API.Workflow.Create.Request,
    ) {
        return await this.libraryService.workflow.create(req.token, body);
    }

    @Get('workflows/:id')
    async getWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: Workflow.Id) {
        return await this.libraryService.workflow.get(req.token, id);
    }

    @Patch('workflows/:id')
    async updateWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: Workflow.Id, @Body() body: Omit<Library.API.Workflow.Update.Request, 'id'>) {
        const payload = Library.API.Workflow.Update.Request.parse({ ...body, id });
        return await this.libraryService.workflow.update(req.token, payload);
    }

    @Delete('workflows/:id')
    async deleteWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: Workflow.Id) {
        return await this.libraryService.workflow.delete(req.token, id);
    }

    @Post('workflows/:id/duplicate')
    @HttpCode(200)
    async duplicateWorkflow(@Req() req: AuthenticatedRequest, @Param('id') id: Workflow.Id) {
        return await this.libraryService.workflow.duplicate(req.token, id);
    }
}
