import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, HttpCode } from '@nestjs/common';
import { LibraryService } from './library.service';
import { Library, Workflow } from '@vx-agent-editor/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';

@Controller('library')
@UseGuards(SupabaseAuthGuard)
export class LibraryController {
    constructor(private readonly libraryService: LibraryService) { }


    @Post('workflows')
    @HttpCode(200)
    async createWorkflow(
        @Req() req: AuthenticatedRequest, 
        @Body() body: any
    ) {
        const payload = Library.API.Workflow.Create.Request.parse(body);
        return await this.libraryService.createWorkflow(req.token, payload);
    }

    
    @Get('workflows/:id')
    async getWorkflow(
        @Req() req: AuthenticatedRequest, 
        @Param('id') id: Workflow.Id
    ) {
        return await this.libraryService.getWorkflow(req.token, id);
    }


    @Get('workflows')
    async listWorkflows(
        @Req() req: AuthenticatedRequest, 
        @Query('folderId') folderId?: Library.Folder.Id
    ) {
        return await this.libraryService.listWorkflows(req.token, folderId);
    }
}

