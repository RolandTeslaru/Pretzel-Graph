import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Library, Workflow } from '@pretzel-graph/shared/domain';
import { LibraryDatabase } from './library.database';

@Injectable()
export class LibraryService {
    constructor(private readonly database: LibraryDatabase) {}

    public readonly bootstrap = {
        get: async (
            token: string,
        ): Promise<Library.API.Bootstrap.Get.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.bootstrap.get(supabase);
        },
    };

    public readonly project = {
        create: async (
            token: string,
            payload: Library.API.Project.Create.Request,
        ): Promise<Library.API.Project.Create.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.project.create(supabase, payload);
        },

        update: async (
            token: string,
            payload: Library.API.Project.Update.Request,
        ): Promise<Library.API.Project.Update.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.project.update(supabase, payload);
        },

        list: async (
            token: string,
        ): Promise<Library.API.Project.List.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.project.list(supabase);
        }
    };

    public readonly folder = {
        create: async (
            token: string,
            payload: Library.API.Folder.Create.Request,
        ): Promise<Library.API.Folder.Create.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.folder.create(supabase, payload);
        },

        update: async (
            token: string,
            payload: Library.API.Folder.Update.Request,
        ): Promise<Library.API.Folder.Update.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.folder.update(supabase, payload);
        },

        delete: async (
            token: string,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.Remove.Response> => {
            const supabase = createAuthenticatedClient(token);
            await this.database.folder.delete(supabase, id);
            return { ok: true };
        },

        getContents: async (
            token: string,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.GetContents.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.folder.getContents(supabase, id);
        }
    };

    public readonly workflow = {
        create: async (
            token: string,
            payload: Library.API.Workflow.Create.Request,
        ): Promise<Library.API.Workflow.Create.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.workflow.create(supabase, payload);
        },

        get: async (
            token: string,
            workflowId: Workflow.Id,
        ): Promise<Library.API.Workflow.Get.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.workflow.get(supabase, workflowId);
        },

        update: async (
            token: string,
            payload: Library.API.Workflow.Update.Request,
        ): Promise<Library.API.Workflow.Update.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.workflow.update(supabase, payload);
        },

        delete: async (
            token: string,
            id: Workflow.Id,
        ): Promise<Library.API.Workflow.Remove.Response> => {
            const supabase = createAuthenticatedClient(token);
            await this.database.workflow.delete(supabase, id);
            return { ok: true };
        },

        duplicate: async (
            token: string,
            id: Workflow.Id,
        ): Promise<Library.API.Workflow.Duplicate.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.database.workflow.duplicate(supabase, id);
        },
    };
}
